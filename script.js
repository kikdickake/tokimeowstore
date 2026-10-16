let currentLevel = 1;
let transitionTimeout;
let dbState = {
    exists: false,
    rows: []
};

const products = [
    { id: 1, product_name: "Рыбка", price: "NULL" },
    { id: 2, product_name: "Молочко", price: 450 },
    { id: 3, product_name: "Корм", price: 800 },
    { id: 4, product_name: "Мячик", price: 300 },
    { id: 5, product_name: "Когтеточка", price: 1500 },
    { id: 6, product_name: "Домик", price: 2500 },
    { id: 7, product_name: "Миска", price: 200 },
    { id: 8, product_name: "Ошейник", price: 600 },
    { id: 9, product_name: "Игрушечная мышка", price: 150 },
    { id: 10, product_name: "Лакомство", price: 350 },
    { id: 11, product_name: "Плед", price: 900 },
    { id: 12, product_name: "Переноска", price: 1800 },
    { id: 13, product_name: "Щётка", price: 400 },
    { id: 14, product_name: "Шампунь", price: 700 },
    { id: 15, product_name: "Перьевая палочка", price: 250 },
    { id: 16, product_name: "Тоннель", price: 1200 },
    { id: 17, product_name: "Поилка", price: 550 },
    { id: 18, product_name: "Витамины", price: 1000 },
    { id: 19, product_name: "Пуходёрка", price: 500 },
    { id: 20, product_name: "Сухой корм", price: 1100 }
];

const levels = [
    {
        prompt: `Котик открыл лавку и хочет создать таблицу для товаров. Напиши команду <code>CREATE TABLE products</code> с полями <code>id</code>, <code>product_name</code> и <code>price</code>.`,
        pattern: /create\s+table\s+products/i,
        success: "Ура! Таблица успешно создана! Переходим к добавлению товаров 🎉",
        onSuccess: () => {
            dbState.exists = true;
            dbState.rows = [];
            renderTable();
        }
    },
    {
        prompt: `Добавь в таблицу ровно 20 товаров одной командой <code>INSERT INTO products ... VALUES</code>. Используй названия: ${products.map(product => product.product_name).join(", ")}.`,
        isValid: input => {
            const values = input.match(/insert\s+into\s+products\b[\s\S]*?\bvalues\b([\s\S]*)/i);
            return Boolean(values && (values[1].match(/\([^()]*\)/g) || []).length === products.length);
        },
        success: "Отлично! В таблицу добавлены все 20 товаров 🐾",
        onSuccess: () => {
            dbState.rows = products.map(product => ({ ...product }));
            renderTable();
        }
    },
    {
        prompt: `Котик забыл указать цену для товара <b>"Рыбка"</b> (id = 1). Используй <code>UPDATE</code>, чтобы установить цену <b>1200</b>.`,
        pattern: /update\s+products\s+set\s+price\s*=\s*1200\s+where\s+id\s*=\s*1/i,
        success: "Великолепно! Цена рыбки обновлена 🐟💖",
        onSuccess: () => updatePrice(1, 1200)
    },
    {
        prompt: `Товар <b>"Молочко"</b> испортился (id = 2). Удали его командой <code>DELETE</code> из таблицы <code>products</code>.`,
        pattern: /delete\s+from\s+products\s+where\s+id\s*=\s*2/i,
        success: "Молочко удалено из таблицы. Котик благодарит тебя! 🥛",
        onSuccess: () => deleteProduct(2)
    },
    {
        prompt: `Покажи котику все товары. Напиши запрос <code>SELECT *</code> для таблицы <code>products</code>.`,
        pattern: /select\s+\*\s+from\s+products/i,
        success: "Вот все товары в магазине! 😺"
    },
    {
        prompt: `Котику нужны только названия товаров. Выбери столбец <code>product_name</code> из таблицы <code>products</code>.`,
        pattern: /select\s+product_name\s+from\s+products/i,
        success: "Список названий готов! 🐾"
    },
    {
        prompt: `Найди товары дороже 500. Используй условие <code>WHERE price &gt; 500</code>.`,
        pattern: /select\s+.+\s+from\s+products\s+where\s+price\s*>\s*500/i,
        success: "Котик нашёл товары дороже 500! 🪙"
    },
    {
        prompt: `Покажи товар с <code>id = 3</code> с помощью условия <code>WHERE</code>.`,
        pattern: /select\s+.+\s+from\s+products\s+where\s+id\s*=\s*3/i,
        success: "Товар с нужным номером найден! 🔎"
    },
    {
        prompt: `Отсортируй товары по цене от дешёвых к дорогим с помощью <code>ORDER BY price ASC</code>.`,
        pattern: /select\s+.+\s+from\s+products\s+order\s+by\s+price(?:\s+asc)?/i,
        success: "Товары отсортированы от дешёвых к дорогим! 📈"
    },
    {
        prompt: `Покажи товары от дорогих к дешёвым: используй <code>ORDER BY price DESC</code>.`,
        pattern: /select\s+.+\s+from\s+products\s+order\s+by\s+price\s+desc/i,
        success: "Самые дорогие товары теперь сверху! 📉"
    },
    {
        prompt: `Посчитай количество товаров в магазине командой <code>SELECT COUNT(*) FROM products</code>.`,
        pattern: /select\s+count\s*\(\s*\*\s*\)\s+from\s+products/i,
        success: "Количество товаров посчитано! 🧮"
    },
    {
        prompt: `Посчитай среднюю цену товаров: используй <code>SELECT AVG(price) FROM products</code>.`,
        pattern: /select\s+avg\s*\(\s*price\s*\)\s+from\s+products/i,
        success: "Средняя цена найдена! 🧮"
    },
    {
        prompt: `Найди самую высокую цену командой <code>SELECT MAX(price) FROM products</code>.`,
        pattern: /select\s+max\s*\(\s*price\s*\)\s+from\s+products/i,
        success: "Котик узнал цену самого дорогого товара! 💰"
    },
    {
        prompt: `Найди самую низкую цену командой <code>SELECT MIN(price) FROM products</code>.`,
        pattern: /select\s+min\s*\(\s*price\s*\)\s+from\s+products/i,
        success: "Самый бюджетный товар найден! 🪙"
    },
    {
        prompt: `Найди товары, название которых начинается на букву «К». Используй <code>WHERE product_name LIKE 'К%'</code>.`,
        pattern: /select\s+.+\s+from\s+products\s+where\s+product_name\s+like\s+['"][Кк]%['"]/i,
        success: "Котик нашёл товары на букву «К»! 🐱"
    },
    {
        prompt: `Найди товары стоимостью от 100 до 1000 включительно с помощью <code>price BETWEEN 100 AND 1000</code>.`,
        pattern: /select\s+.+\s+from\s+products\s+where\s+price\s+between\s+100\s+and\s+1000/i,
        success: "Подходящие по цене товары найдены! 🎯"
    },
    {
        prompt: `Когтеточка (id = 5) подорожала. Измени её цену на 250 командой <code>UPDATE</code>.`,
        pattern: /update\s+products\s+set\s+price\s*=\s*250\s+where\s+id\s*=\s*5/i,
        success: "Цена когтеточки обновлена! 🐾",
        onSuccess: () => updatePrice(5, 250)
    },
    {
        prompt: `Удали из магазина сухой корм (id = 20), используя <code>DELETE FROM products WHERE id = 20</code>.`,
        pattern: /delete\s+from\s+products\s+where\s+id\s*=\s*20/i,
        success: "Сухой корм удалён из таблицы! 🧹",
        onSuccess: () => deleteProduct(20)
    },
    {
        prompt: `Покажи котику все разные цены без повторов. Используй <code>SELECT DISTINCT price FROM products</code>.`,
        pattern: /select\s+distinct\s+price\s+from\s+products/i,
        success: "Список уникальных цен готов! ✨"
    },
    {
        prompt: `Покажи первые 5 товаров с помощью <code>SELECT * FROM products LIMIT 5</code>.`,
        pattern: /select\s+\*\s+from\s+products\s+limit\s+5/i,
        success: "Ура! Котик выполнил все 20 SQL-запросов! 🏆🐾"
    }
];

function checkSql() {
    const input = document.getElementById("sqlInput").value.trim().replace(/;\s*$/, "");
    const message = document.getElementById("message");
    const catFace = document.getElementById("catFace");
    const level = levels[currentLevel - 1];
    const isValid = level.isValid ? level.isValid(input) : level.pattern.test(input);

    if (!isValid) {
        message.innerHTML = `Мрр... Ошибка! Попробуй выполнить запрос из задания ${currentLevel}.`;
        message.className = "error";
        catFace.innerText = "😿";
        return;
    }

    if (level.onSuccess) level.onSuccess();
    message.innerHTML = level.success;
    message.className = "success";
    catFace.innerText = "😸✨";
    document.querySelector("button").disabled = true;
    transitionTimeout = setTimeout(advanceLevel, 2200);
}

function updatePrice(id, price) {
    const item = dbState.rows.find(row => row.id === id);
    if (item) item.price = price;
    renderTable();
}

function deleteProduct(id) {
    dbState.rows = dbState.rows.filter(row => row.id !== id);
    renderTable();
}

function renderTable() {
    document.getElementById("tableNameTitle").innerText = "Таблица: products";
    const header = document.getElementById("tableHeader");
    const body = document.getElementById("dbTableBody");

    header.innerHTML = `<tr><th>id</th><th>product_name</th><th>price</th></tr>`;

    if (dbState.rows.length === 0) {
        body.innerHTML = `<tr><td colspan="3" class="empty-msg">Таблица пуста (нет записей)</td></tr>`;
        return;
    }

    body.innerHTML = dbState.rows.map(row =>
        `<tr><td>${row.id}</td><td>${row.product_name}</td><td>${row.price}</td></tr>`
    ).join("");
}

function advanceLevel() {
    currentLevel++;
    document.getElementById("sqlInput").value = "";
    document.getElementById("message").innerHTML = "";
    document.getElementById("catFace").innerText = "🐱";
    document.querySelector("button").disabled = false;

    if (currentLevel > levels.length) {
        finishGame();
        return;
    }

    document.getElementById("gameTitle").innerText = `SQL Котик: Задание ${currentLevel} из ${levels.length}`;
    document.getElementById("taskText").innerHTML = `
        <b>Задание ${currentLevel} из ${levels.length}:</b> ${levels[currentLevel - 1].prompt}
    `;
}

function finishGame() {
    document.getElementById("gameTitle").innerText = "Игра успешно пройдена!";
    document.getElementById("catFace").innerText = "👑🐱";
    document.getElementById("taskText").innerHTML = "<b>Все задания выполнены!</b> Ты отлично справилась со всеми 20 SQL-запросами.";
    document.getElementById("sqlInput").style.display = "none";
    document.querySelector("button").style.display = "none";
    document.getElementById("resetBtn").style.display = "inline-block";
}

function resetGame() {
    clearTimeout(transitionTimeout);
    currentLevel = 1;
    dbState = { exists: false, rows: [] };
    document.getElementById("sqlInput").value = "";
    document.getElementById("sqlInput").style.display = "block";
    document.querySelector("button").style.display = "inline-block";
    document.querySelector("button").disabled = false;
    document.getElementById("resetBtn").style.display = "none";
    document.getElementById("message").innerHTML = "";
    document.getElementById("catFace").innerText = "🐱";
    document.getElementById("gameTitle").innerText = "Мур-мяу! Помоги котику с магазином!";
    document.getElementById("tableNameTitle").innerText = "Таблица: пуста";
    document.getElementById("tableHeader").innerHTML = "";
    document.getElementById("dbTableBody").innerHTML = `<tr><td colspan="3" class="empty-msg">Таблица еще не создана 🐾</td></tr>`;
    document.getElementById("taskText").innerHTML = `
        <b>Задание 1 из ${levels.length}:</b> ${levels[0].prompt}
    `;
}

document.getElementById("taskText").innerHTML = `
    <b>Задание 1 из ${levels.length}:</b> ${levels[0].prompt}
`;