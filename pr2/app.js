const express = require('express');
const app = express();
const port = 3000;

// "База данных" в памяти — список товаров
let products = [
  { id: 1, name: 'Клавиатура Attack Shark X68HE PRO', price: 5700 },
  { id: 2, name: 'Игровая мышь MCHOSE K7 ULTRA', price: 5867 },
  { id: 3, name: 'Коврик для мыши SteelSeries QcK', price: 1490 }
];

// Middleware для парсинга JSON
app.use(express.json());

// Главная страница (просто заглушка)
app.get('/', (req, res) => {
  res.send('API для списка товаров. Используйте /products');
});

// CRUD для товаров

// CREATE: добавление нового товара
app.post('/products', (req, res) => {
  const { name, price } = req.body;

  const newProduct = {
    id: Date.now(), // простая генерация id, как в примере с users
    name,
    price
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

// READ: получить все товары
app.get('/products', (req, res) => {
  res.json(products);
});

// READ: получить товар по id
app.get('/products/:id', (req, res) => {
  const product = products.find(p => p.id == req.params.id);

  if (!product) {
    return res.status(404).send('Товар не найден');
  }

  res.json(product);
});

// UPDATE (частичное): изменить товар по id
app.patch('/products/:id', (req, res) => {
  const product = products.find(p => p.id == req.params.id);

  if (!product) {
    return res.status(404).send('Товар не найден');
  }

  const { name, price } = req.body;

  if (name !== undefined) {
    product.name = name;
  }

  if (price !== undefined) {
    product.price = price;
  }

  res.json(product);
});

// DELETE: удалить товар по id
app.delete('/products/:id', (req, res) => {
  const id = req.params.id;
  const exists = products.some(p => p.id == id);

  if (!exists) {
    return res.status(404).send('Товар не найден');
  }

  products = products.filter(p => p.id != id);
  res.send('Ok');
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
