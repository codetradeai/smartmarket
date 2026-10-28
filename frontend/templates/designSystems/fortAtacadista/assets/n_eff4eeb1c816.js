/* Tag de Atendimento NeoAssist.com S/A - www.neoassist.com (c) 2026 Todos os Direitos Reservados - Gerado em 17:22:57 | Release em: Produção*/

    (function() {
       var nab = document.createElement('script'); nab.type = 'text/javascript'; nab.async = true;
       var pageid = (NeoAssistTag.pageid) ? '&i=' + encodeURIComponent(NeoAssistTag.pageid) : '';
       var version = '&v=202604';
       var pageurl = (NeoAssistTag.querystring) ? '&p=' + encodeURIComponent(document.location.href) : '&p=' + encodeURIComponent(document.location.href.replace(document.location.search,''));
       nab.src = 'https://cdn.atendimen.to/n.js?ntag=0&d=' + encodeURIComponent(NeoAssistTag.clientdomain) + pageid + pageurl + version;
       var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(nab, s);
   })();