const express = require('express'); // подключаем express
const app = express();
const bodyParser = require("body-parser"); // ПО для разбора post-запросов
const urlencodedParser = bodyParser.urlencoded({
    extended: false
});
const favicon = require('serve-favicon');

const handlebars = require('express-handlebars') // подключаем шаблонизатор handlebars
    .create({
        defaultLayout: 'main'
    });
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000); // назначаем порт, на котором будет слушать сервер

app.use(express.static(__dirname + '/public')); // директорию public делаем недоступной для пользователей
app.use(favicon(__dirname + '/public/img/favicon.ico')); // подключаем фавиконку

// РАБОТА С БД Postgres
const {
    Pool
} = require('pg'); // подготавливаемся к работе с БД
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    password: '',
});

app.get('/users', function (req, res, next) { // получаем данные из БД для списка пользователей
    pool.connect(function (err, client, done) {
        if (err) {
            done();
            console.log(err);
            return res.status(500).json({
                success: false,
                data: err
            });
        }
        client.query('SELECT * FROM users;', [], function (err, result) {
            done();
            if (err) {
                console.log(err);
                return res.status(500).json({
                    success: false,
                    data: err
                });
            }
            let results = [];
            for (let i = 0; i < result.rows.length; i++) {
                results.push(JSON.stringify((result.rows)[i]));
            }
            res.render('list', {
                users: results // отдаём в представление полученный массив записей из БД
            });
        })
    });
});

app.post('/register', urlencodedParser, function (req, res) { // записываем данные из формы в БД
    let user = req.body;
    console.log(req.body);

    pool.connect(function (err, client, done) {
        if (err) {
            done();
            console.log(err);
            return res.status(500).json({
                success: false,
                data: err
            });
        }
        // TODO: реализовать проверку наличия пользователя в БД
        client.query("INSERT INTO users(name, surname, email, password) values($1, $2, $3, $4)",
            [user.name, user.surname, user.email, user.password],
            function (err, result) {
                done();
                if (err) {
                    return err;
                }
                client.query("SELECT * FROM users;", function (err, result) { // отображаем пополнившийся список пользователей
                    let results = [];
                    for (let i = 0; i < result.rows.length; i++) {
                        results.push(JSON.stringify((result.rows)[i]));
                    }
                    res.render('list', {
                        users: results // отдаём в представление полученный массив записей из БД
                    });
                });
            });
    })
});

app.post('/login', urlencodedParser, function (req, res) { // работа с формой при входе в уч. запись
    let user = req.body;
    pool.connect(function (err, client, done) {
        if (err) {
            done();
            console.log(err);
            return res.status(500).json({
                success: false,
                data: err
            });
        }
        client.query('SELECT * FROM users WHERE email = $1 AND password = $2', [user.email, user.password],
            function (err, result) {
                done();
                if (err) {
                    return err;
                }
                if (!result.rows[0])
                    res.redirect('login');
                else
                    res.render('home', {
                        entered: true,
                        name: result.rows[0].name,
                        surname: result.rows[0].surname
                    });
            });
    })
});

// ОБРАБОТЧИКИ МАРШРУТОВ
app.get('/', function (req, res) {
    res.render('home');
});

app.get('/about', function (req, res) {
    res.render('about');
});

app.get('/users', function (req, res) {
    res.render('list');
});

app.get('/register', function (req, res) {
    res.render('register');
});

app.get('/login', function (req, res) {
    res.render('login');
});

// ОБРАБОТКА ОШИБОК 404 И 500
app.use(function (req, res, next) {
    res.status(404);
    res.render('404');
});

app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500);
    res.render('500');
});

// СЕРВЕР
app.listen(app.get('port'), function () {
    console.log('Express runs on localhost:' +
        app.get('port') + '; press Ctrl+C to stop.');
});