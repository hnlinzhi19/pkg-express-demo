'use strict';
const opn = require('opn');
const path = require('path');
var express = require('express');
const globby = require('globby');
const net = require('net');
var app = express();
var Server = require('http').Server;
var server = new Server(app);

const dir = path.parse(process.title).dir || path.join(__dirname, './packed');
console.log(dir, 'test');

var port = 3000;


// 检测port是否被占用
function probe(port, callback) {

    var server = net.createServer().listen(port)

    var calledOnce = false

    var timeoutRef = setTimeout(function () {
        calledOnce = true
        callback(false, port)
    }, 2000)

    timeoutRef.unref()

    var connected = false

    server.on('listening', function () {
        clearTimeout(timeoutRef)

        if (server)
            server.close()

        if (!calledOnce) {
            calledOnce = true
            callback(true, port)
        }
    })

    server.on('error', function (err) {
        clearTimeout(timeoutRef)

        var result = true
        if (err.code === 'EADDRINUSE')
            result = false

        if (!calledOnce) {
            calledOnce = true
            callback(result, port)
        }
    })
}

function serverNow() {
    probe(port, function (bl, _pt) {
        // 端口被占用 bl 返回false
        // _pt：传入的端口号
        if (bl === true) {
            // ssr(_pt)
            openServer();
        } else {
            port += 1;
            serverNow();
        }
    })
}

function openServer() {

    server.listen(port, function () {
        opn('http://localhost:' + port);
    });

    // __dirname is used here along with package.json.pkg.assets
    // see https://github.com/zeit/pkg#config and
    // https://github.com/zeit/pkg#snapshot-filesystem
    app.use('/lib', express.static(__dirname + '/views/lib'));

    app.use('/imgs', express.static(dir + '/myphotos'));

    app.set('views', path.join(__dirname, '/views'));
    app.engine('.html', require('ejs').__express);
    app.set('view engine', 'html');

    app.get('/', function (req, res) {
        //   res.sendFile(__dirname + '/views/index.html');
        const list = globby.sync(path.join(dir, '/myphotos/**/*.{jpg,gif,png,mp4,avi}'));
        const mp3List = globby.sync(path.join(dir, '/myphotos/**/*.{mp3,wav}'));
        let tmp = [];
        let tmpMp3 = [];
        // 图片列表
        list.forEach(function (v) {
            tmp.push({
                img: '/imgs/' + path.relative(path.join(dir + '/myphotos'), v),
                id: path.parse(v).name,
                isMp4: /\.(mp4|wav)$/.test(v.toLowerCase()) ? true : false,
                isAvi: /\.(wav)$/.test(v.toLowerCase()) ? true : false
            });
        });
        // 声音列表
        mp3List.forEach(function (v) {
            tmpMp3.push({
                mp3: '/imgs/' + path.relative(path.join(dir + '/myphotos'), v),
                id: path.parse(v).name
            });
        });
        res.render('index', {
            title: 'PHOTO',
            list: tmp,
            mp3List: tmpMp3
        });
    });

}

serverNow();