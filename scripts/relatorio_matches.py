import json

d = json.load(open('scripts/saida/banco_produtos_otimizado.json', encoding='utf-8'))
prods = d['produtos']
ofertas = d['ofertas']

multi_2 = [p for p in prods if p.get('total_mercados', 0) >= 2]
multi_3 = [p for p in prods if p.get('total_mercados', 0) >= 3]
multi_4 = [p for p in prods if p.get('total_mercados', 0) >= 4]

print(f"Total canônicos: {len(prods)}")
print(f"Total ofertas agrupadas: {len(ofertas)}")
print(f"Produtos em 2+ mercados: {len(multi_2)}")
print(f"Produtos em 3+ mercados: {len(multi_3)}")
print(f"Produtos em 4+ mercados: {len(multi_4)}")
print("\n--- 15 EXEMPLOS DE COMPARAÇÃO DIRETA ---")

mapa_ofertas = {}
for of in ofertas:
    mapa_ofertas.setdefault(of['produto_id'], []).append(of)

for i, p in enumerate(multi_3[:15], 1):
    pid = p['produto_id']
    ofs = mapa_ofertas.get(pid, [])
    print(f"\n{i}. {p['nome_canonico']} (Marca: {p.get('marca') or 'N/D'})")
    print(f"   Economia Máxima: R$ {p.get('economia_maxima', 0):.2f} (De R$ {p.get('menor_preco', 0):.2f} até R$ {p.get('maior_preco', 0):.2f})")
    for o in ofs:
        promo_tag = " [PROMOÇÃO]" if o.get('em_promocao') else ""
        print(f"   - {o['rede'].ljust(22)}: R$ {o['preco']:.2f}{promo_tag} ({len(o['filiais_ids'])} filiais)")

