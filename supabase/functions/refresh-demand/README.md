# refresh-demand
Intención por producto (sesiones que aterrizan en la PDP → carrito → checkout → compra), embudo
diario de la tienda y búsquedas, desde ShopifyQL. Escribe `product_intent`, `store_funnel_daily`
y `store_searches`. Comparte los secretos de `refresh-shopify`. El código vive desplegado en
Supabase (proyecto luxurcontentdept); correr cada 6 h con pg_cron:
`select cron.schedule('refresh-demand', '0 */6 * * *', $$select net.http_post('https://nrpgtlcdvtesjbxpkxha.supabase.co/functions/v1/refresh-demand', '{}'::jsonb)$$);`
