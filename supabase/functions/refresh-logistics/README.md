# refresh-logistics
Un renglón por pedido pagado de los últimos 45 días no entregado (más entregados de la última
semana), fusionando Shopify (fulfillments + eventos), el webhook de Envíoclick (`shipment_tracking`)
y la consulta en vivo a Envíoclick para los abiertos con guía (en paralelo, máx 40). Escribe
`public.shipments`; la app clasifica (novedad, sin despachar, sin movimiento, demorado, local).
Cron cada 15 min (`refresh-logistics-15min`). El código vive desplegado en Supabase.
