var Redmine = require('node-redmine');
var Request = require("request");
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var url = process.env.REDMINE_HOST || '';
var config = {
    apiKey: process.env.REDMINE_APIKEY || '',
    format: 'json'
};

var listaFeriados = [];
obtenerFeriados();

/**
 * obtenerIssue
 */
var obtenerIssue = function (issue) {
    return new Promise((resolve, reject) => {
        console.log('obtenerIssue');
        var issue_id = 7851;
        var params = { include: 'attachments,journals,watchers' };
        redmine.get_issue_by_id(issue_id, params, function (err, data) {
            if (err) reject(err);
            resolve(data.issue);
        });
    });
};

/**
 * obtenerIssues
 */
var obtenerIssues = function () {
    console.log('Issues:');
    return new Promise((resolve, reject) => {
        redmine.issues({ limit: 2 }, function (err, data) {
            if (err) reject(err);
            resolve({ total: data.total_count, issues: data.issues });
        });
    });
};


/**
 * obtenerHoras
 */
var obtenerHoras = function () {
    console.log('Horas:');
    return new Promise((resolve, reject) => {
        var params = {
            limit: 25,
            user_id: 268,
            project_id: 'echeq-desarrollo-angular-java'
        };
        redmine.time_entries(params, function (err, data) {
            if (err) reject(err);
            resolve(data);
        });
    });
};


/**
 * cargarHorasDia
 * 
 * @param {Object} params
 *  issue_id or project_id (only one is required): the issue id or project id to log time on
    spent_on: the date the time was spent (default to the current date)
    hours (required): the number of spent hours
    activity_id: 
    <option value="8">Análisis y Diseño</option>
    <option value="9">Desarrollo</option>
    <option value="18">Diseño Digital </option>
    <option value="11">Documentación</option>
    <option value="10">Implementación</option>
    <option value="12">Testing</option>
    <option value="13">Soporte</option>
    <option value="14">Capacitación</option>
    <option value="15">Licencia</option>
    <option value="16">Sin Asignación</option>
    <option value="19">Gestión</option></select>
    comments: short description for the entry (255 characters max)
 */
var cargarHorasDia = function (day, issue, hs, token) {
    console.log('Cargando ' + hs + 'hs al dia ' + day.getDate() + '/' + (parseInt(day.getMonth()) + 1));
    return new Promise((resolve, reject) => {
        var config = {
            apiKey: token,
            format: 'json'
        };
        var redmine = new Redmine(url, config);
        var params = {
            time_entry: {
                issue_id: issue,
                spent_on: day.toISOString().slice(0, 10),
                hours: hs,
                activity_id: 9 // Desarrollo
            }
        };
        redmine.create_time_entry(params, function (err, data) {
            if (err) reject(err);
            resolve(data);
        });
    });
};

/**
 * cargarHorasMes
 * 
 * @param {Object} params
 * 
 * issue_id or project_id (only one is required): the issue id or project id to log time on
    spent_on: the date the time was spent (default to the current date)
    hours (required): the number of spent hours
    activity_id: 
    <option value="8">Análisis y Diseño</option>
    <option value="9">Desarrollo</option>
    <option value="18">Diseño Digital </option>
    <option value="11">Documentación</option>
    <option value="10">Implementación</option>
    <option value="12">Testing</option>
    <option value="13">Soporte</option>
    <option value="14">Capacitación</option>
    <option value="15">Licencia</option>
    <option value="16">Sin Asignación</option>
    <option value="19">Gestión</option></select>
    comments: short description for the entry (255 characters max)
 */
var cargarHorasMes = function (mes, issue, hs, token) {
    let dias = obtenerDiasSemanaEnMes(mes, new Date().getFullYear());
    dias = obtenerDiasLaborables(dias, mes);
    let promises = [];
    dias.forEach(dia => {
        promises.push(cargarHorasDia(dia, issue, hs, token));
    });
    return Promise.all(promises);
};

/**
 * cargarHorasRango
 * 
 * @param {Object} params
 * 
 * issue_id or project_id (only one is required): the issue id or project id to log time on
    spent_on: the date the time was spent (default to the current date)
    hours (required): the number of spent hours
    activity_id: 
    <option value="8">Análisis y Diseño</option>
    <option value="9">Desarrollo</option>
    <option value="18">Diseño Digital </option>
    <option value="11">Documentación</option>
    <option value="10">Implementación</option>
    <option value="12">Testing</option>
    <option value="13">Soporte</option>
    <option value="14">Capacitación</option>
    <option value="15">Licencia</option>
    <option value="16">Sin Asignación</option>
    <option value="19">Gestión</option></select>
    comments: short description for the entry (255 characters max)
 */
var cargarHorasRango = function (desde, hasta, issue, hs, token) {
    let dias = obtenerDiasSemanaRango(desde, hasta);
    let promises = [];
    dias.forEach(dia => {
        promises.push(cargarHorasDia(dia, issue, hs, token));
    });
    return Promise.all(promises);
};




/**
 * consultarHsXMes
 * 
 * @param {Object} params
 * 
 */
var consultarHsXMes = function (mes, token) {
    console.log('Consultando hs x mes ' + mes);
    return new Promise((resolve, reject) => {
        var config = {
            apiKey: token,
            format: 'json'
        };
        var redmine = new Redmine(url, config);
        var params = {};
        redmine.current_user(params, function (err, currentU) {
            if (err) reject(err);
            if (currentU.user) {
                var range = getFromTo(mes);
                var params = {
                    user_id: currentU.user.id,
                    from: range.from.toISOString().slice(0, 10),
                    to: range.to.toISOString().slice(0, 10),
                    limit: 40
                };
                redmine.time_entries(params, function (err, data) {
                    if (err) reject(err);
                    data.user = currentU.user;
                    resolve(data);
                });
            } else {
                reject(err);
            }
        });
    });
};


function daysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
}

function getFromTo(month) {
    var date = new Date(2019, month, 1);
    var range = {};
    var firstDay = new Date(date.getFullYear(),
        date.getMonth(), 1);

    var lastDay = new Date(date.getFullYear(),
        date.getMonth(), daysInMonth(date.getMonth() + 1,
            date.getFullYear()));
    range.from = firstDay;
    range.to = lastDay;
    console.log(range);

    return range;
}

/**
 * @param {int} Mes
 * @param {int} Año
 * Dias de semana
 */
function obtenerDiasSemanaEnMes(mes, ano) {
    var date = new Date(ano, mes, 1);
    var days = [];
    while (date.getMonth() === mes) {
        if (date.getDay() !== 0 && date.getDay() !== 6) { // No sabado ni domingos
            days.push(new Date(date));
        }
        date.setDate(date.getDate() + 1);
    }
    return days;
}

/**
 * Dias feriado
 */
function obtenerFeriados() {
    var ano = new Date().getFullYear(); // año actual
    Request.get({
        headers: { "content-type": "application/json" },
        url: "http://nolaborables.com.ar/api/v2/feriados/" + ano + "?formato=mensual"
    }, (error, response, body) => {
        if (error) {
            return [];
        }
        listaFeriados = JSON.parse(body);
    });
}

/**
 * @param {int} Mes
 * @param {int} Año
 * Dias de semana laborables, no feriado
 */
function obtenerDiasLaborables(dias, mes) {
    const feriadoXMes = listaFeriados[mes];
    Object.keys(feriadoXMes).forEach(function (d) {
        if (feriadoXMes[d].tipo === 'inamovible' || feriadoXMes[d].tipo === 'puente' || feriadoXMes[d].tipo === 'trasladable') {
            dias = dias.filter(dia => parseInt(dia.getDate()) !== parseInt(d)); // Quitamos el dia feriado
        }
    });
    return dias;
}

/**
 * @param {date} desde
 * @param {date} hasta
 * Dias de semana en rango
 */
function obtenerDiasSemanaRango(desde, hasta) {
    // Esto no hace ningún esfuerzo para tener en cuenta las vacaciones
    // Cuenta el día final, no cuenta el día de inicio

    // hacer copias que podamos normalizar sin cambiar los objetos pasados   
    const start = new Date(desde);
    const end = new Date(hasta);

    // dias array
    let businessDays = [];

    // normalizar tanto el inicio como el final del día
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    let current = new Date(start);
    current.setDate(current.getDate() + 1);
    let day;
    // recorre cada día, comprobando
    while (current <= end) {
        day = current.getDay();
        if (day >= 1 && day <= 5) {
            businessDays.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
    }
    return businessDays;
}

app.get('/api/obtenerIssue', function (req, res) {
    obtenerIssue(7851).then((data) => {
        res.send(data);
    });
});

app.get('/api/obtenerIssues', function (req, res) {
    obtenerIssues().then((data) => {
        res.send(data);
    });
});

app.get('/api/obtenerHoras', function (req, res) {
    obtenerHoras().then((data) => {
        res.send(data);
    });
});

app.get('/api/obtenerDiasLaborables', function (req, res) {
    let dias = obtenerDiasSemanaEnMes(new Date().getMonth(), new Date().getFullYear());
    dias = obtenerDiasLaborables(dias, new Date().getMonth());
    res.send(dias);
});

//  url/cargarHorasDia/7851/2019-07-17/8
app.get('/api/cargarHorasDia/:issue/:dia/:hs', function (req, res) {
    cargarHorasDia(new Date(req.params.dia), req.params.issue, req.params.hs).then((data) => {
        res.send(data);
    });
});

//  url/cargarHorasMes/7851/6/8
app.get('/api/cargarHorasMes/:issue/:mes/:hs', function (req, res) {
    cargarHorasMes(6, 7851, 8).then((data) => {
        res.send(data);
    });
});

// API

app.post('/api/cargarHorasDia', function (req, res) {
    console.log('body: ' + JSON.stringify(req.body));
    var token = req.body.token;
    var issue = req.body.issue;
    var hs = req.body.hs;
    var dia = req.body.dia;

    cargarHorasDia(new Date(dia), issue, hs, token).then((data) => {
        res.send(data);
    });
});

app.post('/api/cargarHorasMes', function (req, res) {
    console.log('body: ' + JSON.stringify(req.body));
    var token = req.body.token;
    var issue = req.body.issue;
    var hs = req.body.hs;
    var mes = req.body.mes;

    cargarHorasMes(mes, issue, hs, token).then((data) => {
        res.send(data);
    });
});

app.post('/api/cargarHorasRango', function (req, res) {
    console.log('body: ' + JSON.stringify(req.body));
    var token = req.body.token;
    var issue = req.body.issue;
    var hs = req.body.hs;
    var desde = req.body.desde;
    var hasta = req.body.hasta;
    cargarHorasRango(desde, hasta, issue, hs, token).then((data) => {
        res.send(data);
    });
});

app.post('/api/consultarHsXMes', function (req, res) {
    console.log('body: ' + JSON.stringify(req.body));
    var token = req.body.token;
    var mes = req.body.mes;

    consultarHsXMes(new Date(mes), token).then((data) => {
        res.send(data);
    });
});

app.get('/flippimine', function (req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

// 404
app.get('*', function (req, res) {
    res.status(404).send('Me parece que te perdiste');
});
app.post('*', function (req, res) {
    res.status(404).send('Me parece que te perdiste');
});

// UP
app.listen(5000, function () {
    console.log('FlippiMine iniciado en puerto 5000');
});
