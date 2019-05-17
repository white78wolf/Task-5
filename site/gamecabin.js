const express = require('express'); // подключаем express
const app = express();
const credentials = require('./credentials'); // импортируем cookie-секрет
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

app.use(require('cookie-parser')(credentials.cookieSecret)); // прикручиваем функционал для работы с cookie
app.use(require('express-session')({
    resave: false,
    saveUninitialized: false,
    secret: credentials.cookieSecret,
})); // middleware для работы с сессией и сохранением состояния

// РАБОТА С БД Postgres
const {
    Pool
} = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    password: '',
});

// GET-запрос на выдачу списка пользователей в БД
app.get('/users', function (req, res) {
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
                results.push(result.rows[i]);
            }            

            res.render('list', {
                users: results, // отдаём в представление полученный массив записей из БД
                user: req.session.userName
            });
        });
    });
});

// POST-запрос с данными регистрации пользователя - проверяем наличие пользователя и делаем запись
app.post('/register', urlencodedParser, function (req, res) {
    let user = req.body;
    pool.connect(function (err, client, done) {
        if (err) {
            done();
            console.log(err);
            return res.render('500');
        }
        client.query("SELECT * FROM users WHERE email = $1",
            [user.email],
            function (err, result) {
                if (err) {
                    done();
                    return err;
                }
                if (result.rows[0]) {
                    done();
                    return res.render('register', {
                        already: true
                    });
                }
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
                                results.push(result.rows[i]);
                            }
                            res.render('list', {
                                users: results // отдаём в представление полученный массив записей из БД
                            });
                        });
                    });

            });
    })
});

// POST-запрос с логином (email) и паролем
app.post('/login', urlencodedParser, function (req, res) {
    let user = req.body;
    pool.connect(function (err, client, done) {
        if (err) {
            done();
            console.log(err);
            return res.render('500');
        }
        client.query('SELECT * FROM users WHERE email = $1 AND password = $2',
            [user.email, user.password],
            function (err, result) {
                done();
                if (err) {
                    return err;
                }
                if (!result.rows[0])
                    return res.render('register', {
                        warning: true // если при входе учётная запись не обнаружена, возвращается страница регистрации с сообщением
                    });
                else {
                    req.session.userName = result.rows[0].name + " " + result.rows[0].surname; // сохраняем имя пользователя в сессии                    
                    res.render('home', {
                        user: req.session.userName
                    });
                }
            });
    })
});

// ОБРАБОТЧИКИ МАРШРУТОВ
app.get('/', function (req, res) {
    res.render('home', {
        user: req.session.userName
    });
});

app.get('/about', function (req, res) {
    res.render('about', {
        user: req.session.userName
    });
});

app.get('/register', function (req, res) {
    res.render('register');
});

app.get('/login', function (req, res) {
    res.render('login');
});

app.get('/logout', function (req, res) {
    req.session.userName = null;
    res.render('home');
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