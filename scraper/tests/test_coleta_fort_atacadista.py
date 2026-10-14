import importlib.util
import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import Mock, patch

SCRAPER = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('fort', SCRAPER / 'coleta_fort_atacadista.py')
fort = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fort)
FIXTURES = Path(__file__).parent / 'fixtures'
INSTANTE = datetime(2026, 10, 4, 10, 30, tzinfo=timezone(timedelta(hours=-3)))


def item(**pricing):
    return {'name': 'Arroz exemplo', 'pricing': pricing}


class TransformacaoTest(unittest.TestCase):
    def transformar(self, value):
        return fort.transformar_item(value, 'Graos', INSTANTE)

    def test_preco_regular_e_contrato_compativel(self):
        row = self.transformar(item(price=10.5))
        self.assertEqual(tuple(row), fort.CAMPOS)
        self.assertEqual(row['preco'], 10.5)
        self.assertEqual(row['nome_bruto'], 'Arroz exemplo')
        self.assertIsNone(row['marca'])

    def test_promocao_nula_usa_preco_regular(self):
        self.assertEqual(self.transformar(item(price=10, promotionalPrice=None))['preco'], 10)

    def test_promocao_valida_preserva_ambos_precos(self):
        row = self.transformar(item(price=10, promotionalPrice=8, promotion=True))
        self.assertEqual((row['preco'], row['preco_normal'], row['em_promocao']), (8, 10, True))

    def test_promocao_sem_preco_normal_nao_inventa_valor(self):
        row = self.transformar(item(promotionalPrice=8))
        self.assertEqual(row['preco'], 8)
        self.assertIsNone(row['preco_normal'])

    def test_precos_invalidos_rejeitados(self):
        for value in [None, 0, -1, True, False, '', 'R$ 5,00', 'NaN', 'Infinity', {}, [], '1e999', '1e-999']:
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.transformar(item(price=value))

    def test_promocao_invalida_nao_faz_fallback_silencioso(self):
        for value in [0, -1, 'NaN', False]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.transformar(item(price=10, promotionalPrice=value))

    def test_preco_normal_invalido_rejeita_registro(self):
        with self.assertRaises(ValueError):
            self.transformar(item(price=-1, promotionalPrice=8))

    def test_decimal_string_da_api(self):
        self.assertEqual(self.transformar(item(price='10.50'))['preco'], 10.5)

    def test_item_ou_campos_obrigatorios_invalidos(self):
        for value in [None, [], {}, {'name': '  ', 'pricing': {'price': 2}},
                      {'name': 'Arroz', 'pricing': []}, {'name': 123, 'pricing': {'price': 2}}]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.transformar(value)

    def test_timestamp_utc_preserva_instante(self):
        text = self.transformar(item(price=5))['data_coleta']
        self.assertEqual(text, '2026-10-04T13:30:00+00:00')
        self.assertEqual(datetime.fromisoformat(text), INSTANTE)

    def test_rejeita_clock_sem_fuso(self):
        with self.assertRaises(ValueError):
            fort.transformar_item(item(price=5), 'Graos', datetime(2026, 10, 4))


class ColetaTest(unittest.TestCase):
    def collect(self, buscar, falhas=None):
        return fort.coletar_categoria('Graos', '1815215', buscar=buscar, falhas=falhas,
                                      dormir=lambda _: None, agora=lambda: INSTANTE)

    def test_item_ruim_nao_interrompe_lote(self):
        falhas = []
        buscar = Mock(return_value={'hits': [None, item(price=-1), item(price=5)], 'hasNext': False})
        with self.assertLogs(fort.LOGGER, level='WARNING'):
            rows = self.collect(buscar, falhas)
        self.assertEqual([row['preco'] for row in rows], [5])
        self.assertEqual(len(falhas), 2)
        self.assertEqual(falhas[0]['indice'], 0)

    def test_paginacao_e_limite_de_produtos(self):
        buscar = Mock(return_value={'hits': [item(price=5)] * 10, 'hasNext': True})
        rows = self.collect(buscar)
        self.assertEqual(len(rows), 20)
        self.assertEqual([call.kwargs['params']['from'] for call in buscar.call_args_list], [0, 10])
        self.assertEqual(buscar.call_args.kwargs['timeout'], 10)

    def test_falha_pagina_preserva_itens_anteriores(self):
        falhas = []
        buscar = Mock(side_effect=[{'hits': [item(price=5)], 'hasNext': True}, fort.ErroColeta('timeout')])
        with self.assertLogs(fort.LOGGER, level='WARNING'):
            rows = self.collect(buscar, falhas)
        self.assertEqual(len(rows), 1)
        self.assertEqual(falhas[0]['motivo'], 'timeout')

    def test_resposta_malformada_fica_explicita(self):
        for payload in [None, [], {}, {'hits': None}, {'hits': [], 'hasNext': 'false'}]:
            with self.subTest(payload=payload), self.assertLogs(fort.LOGGER, level='WARNING'):
                falhas = []
                self.assertEqual(self.collect(Mock(return_value=payload), falhas), [])
                self.assertEqual(len(falhas), 1)

    def test_pagina_vazia_encerra_sem_falha(self):
        buscar = Mock(return_value={'hits': [], 'hasNext': False})
        falhas = []
        self.assertEqual(self.collect(buscar, falhas), [])
        self.assertFalse(falhas)
        buscar.assert_called_once()

    def test_limite_paginas_com_todos_itens_invalidos(self):
        buscar = Mock(return_value={'hits': [None], 'hasNext': True})
        falhas = []
        with self.assertLogs(fort.LOGGER, level='WARNING'):
            self.assertEqual(self.collect(buscar, falhas), [])
        self.assertEqual(buscar.call_count, fort.MAX_PAGINAS_POR_CATEGORIA)
        self.assertEqual(falhas[-1]['motivo'], 'limite_paginas')

    def test_cliente_http_converte_erros_sem_vazar_resposta(self):
        class RequestError(Exception): pass
        requests = types.SimpleNamespace(RequestException=RequestError, get=Mock())
        for etapa in ['request', 'status', 'json']:
            with self.subTest(etapa=etapa):
                requests.get.reset_mock(side_effect=True)
                response = Mock()
                requests.get.return_value = response
                if etapa == 'request': requests.get.side_effect = RequestError('conteudo_privado')
                if etapa == 'status': response.raise_for_status.side_effect = RequestError('conteudo_privado')
                if etapa == 'json': response.json.side_effect = ValueError('conteudo_privado')
                with patch.dict(sys.modules, {'requests': requests}), self.assertRaises(fort.ErroColeta) as exc:
                    fort.buscar_pagina('https://example.invalid', headers={}, params={}, timeout=10)
                self.assertNotIn('conteudo_privado', str(exc.exception))


class ExecucaoOfflineTest(unittest.TestCase):
    def test_fixture_valida_gera_json_csv_relatorio_sem_rede(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(fort, 'buscar_pagina', side_effect=AssertionError('rede proibida')):
            code = fort.main(['--fixture', str(FIXTURES / 'fort_valido.json'), '--output-dir', directory])
            output = Path(directory)
            rows = json.loads((output / 'produtos_coletados.json').read_text())
            report = json.loads((output / 'relatorio_coleta.json').read_text())
            self.assertEqual(code, 0)
            self.assertEqual(len(rows), 3)
            self.assertEqual(report['status'], 'concluido')
            self.assertEqual(report['modo'], 'fixture')
            self.assertEqual((output / 'produtos_coletados.csv').read_text().splitlines()[0], ','.join(fort.CAMPOS))

    def test_fixture_parcial_preserva_itens_e_sinaliza_status(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(fort, 'buscar_pagina', side_effect=AssertionError('rede proibida')):
            code = fort.main(['--fixture', str(FIXTURES / 'fort_parcial.json'), '--output-dir', directory])
            report = json.loads((Path(directory) / 'relatorio_coleta.json').read_text())
            self.assertEqual(code, 2)
            self.assertEqual(report['aceitos'], 1)
            self.assertEqual(len(report['falhas']), 3)
            self.assertEqual(report['status'], 'parcial')

    def test_falha_primeira_categoria_nao_bloqueia_segunda(self):
        fixture = {'1815285': [{'hits': [item(price=5)], 'hasNext': False}]}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'fixture.json'
            path.write_text(json.dumps(fixture))
            self.assertEqual(fort.main(['--fixture', str(path), '--output-dir', directory]), 2)
            rows = json.loads((Path(directory) / 'produtos_coletados.json').read_text())
            self.assertEqual(rows[0]['categoria'], 'Leites')

    def test_falha_total_preserva_saida_anterior(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            (output / 'fixture.json').write_text('{}')
            (output / 'produtos_coletados.json').write_text('["anterior"]')
            (output / 'produtos_coletados.csv').write_text('anterior')
            self.assertEqual(fort.main(['--fixture', str(output / 'fixture.json'), '--output-dir', directory]), 1)
            self.assertEqual((output / 'produtos_coletados.json').read_text(), '["anterior"]')
            self.assertEqual((output / 'produtos_coletados.csv').read_text(), 'anterior')
            report = json.loads((output / 'relatorio_coleta.json').read_text())
            self.assertFalse(report['saida_atualizada'])
            self.assertEqual(report['status'], 'falhou')

    def test_fixture_invalida_nao_acessa_http(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(fort, 'buscar_pagina', side_effect=AssertionError('rede proibida')):
            path = Path(directory) / 'fixture.json'
            path.write_text('not json')
            self.assertEqual(fort.main(['--fixture', str(path), '--output-dir', directory]), 1)
            self.assertFalse((Path(directory) / 'produtos_coletados.json').exists())

    def test_escrita_interrompida_preserva_arquivo(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'saida.json'
            path.write_text('anterior')
            def falhar(arquivo):
                arquivo.write('incompleto')
                raise OSError('falha simulada')
            with self.assertRaises(OSError):
                fort.salvar_atomico(path, falhar)
            self.assertEqual(path.read_text(), 'anterior')
            self.assertEqual(list(Path(directory).iterdir()), [path])


if __name__ == '__main__':
    unittest.main()
