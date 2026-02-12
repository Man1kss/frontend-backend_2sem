# Команды для проверки (проверялось в cmd)
## Все товары (READ all)
curl http://localhost:3000/products

## Товар по id (READ one)
curl http://localhost:3000/products/1

## Создать товар (CREATE)
curl -X POST http://localhost:3000/products ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Наушники HyperX\",\"price\":6000}"

## Обновить товар (UPDATE)
curl -X PATCH http://localhost:3000/products/1 ^
  -H "Content-Type: application/json" ^
  -d "{\"price\":8000}"

## Удалить товар (DELETE)
curl -X DELETE http://localhost:3000/products/1

