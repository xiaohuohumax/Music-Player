$(window).ready(() => {
    new Vue({
        el: '#musicPlayer',
        data: {
            // 可编辑区域
            flagPConClose: false,// 是否打开控件
            flagPLrcClose: false,// 是否打开歌词 
            falgPListClose: false,// 是否打开歌单
            /* 注意
            歌词和歌单不可同时开启
            依据歌词为准
            */
            flagSound: false,// 是否静音
            nowMusicNumber: 0, // 现在在播放的编号
            musicPlayerMode: 0,// 播放模式 // 0:循环播放 1:随机播放 2:单曲循环
            timeMoveMax: 3,// 时间最多拖动到结束的前几秒
            musciStartVolume: 0.5,// 初始音量
            dClickSensitive: 400,// 双击检测灵敏度
            flagPlayOrPause: false,// 播放还是暂停
            musicList: [{
                musicName: 'fire',
                musicAuther: 'Ross Golan',
                musicLrc: './lrc/Fire.lrc',
                musicUrl: './music/Fire.mp3'
            }, {
                musicName: 'Counting Stars',
                musicAuther: 'Ryan Tedder',
                musicLrc: './lrc/Counting Stars.lrc',
                musicUrl: './music/Counting Stars.mp3'
            }, {
                musicName: 'Heart To Heart',
                musicAuther: 'James Blunt',
                musicLrc: './lrc/Heart To Heart.lrc',
                musicUrl: './music/Heart To Heart.mp3'
            }, {
                musicName: 'Humbug',
                musicAuther: 'Owl City',
                musicLrc: './lrc/Humbug.lrc',
                musicUrl: './music/Humbug.mp3'
            }],// 歌单 
            /* 歌单格式
            {
                musicName:'', // 歌曲名字
                musicAuther:'',// 作者
                musiLrc:'',// 歌词
                musicUrl:'',// 歌曲url
            }
            注意: 可以异步加载数据到 musicList数组中.
            */
            // 不可修改
            flagPConList: true,// 歌单是下展开还是上展开-会自动修改
            lastSound: 0.5,// 静音时的音量
            musicLrc: "",// 歌词解析对象
            musicWord: "",// 歌词
            timer: null,// 单双击冲突
            canplay: false,// 是否能够播放
            playerLrc: '#playerLrc',// 歌词展示dom对象id
            musicPlayer: '#musicPlayer',// 播放器dom对象id
            pBLoundItem: '#pBLoundItem',// 音量滑动条按钮
            pBTimeItem: '#pBTimeItem',// 时间滑动条按钮
            pBTime: '#pBTime',// 时间滑动条主体
            pBLound: '#pBLound',// 声音滑动条主体
            pBTimeNum: '#pBTimeNum',// 时间显示
            pHeadClick: '#pHeadClick',// 头部播放/下一首按钮
            pScrollBlock: '.pScrollBlock',// 滑动条的渐变色背景
            playerHead: '#playerHead',
            aduioId: document.getElementById('musicPlayerAudio'),// 播放器audio
            musicModeList: ['pBAgain', 'pBRandom', 'pBOnly'],// 循环播放 随机播放  单曲循环
            musicModeName: ['循环', '随机', '单曲'],
        },
        // 监视
        watch: {
            // 歌词控件监视
            'flagPLrcClose': function (newValue, oldValue) {
                if (!newValue) {
                    $(this.playerLrc).css({ "width": "0px" });
                } else {
                    this.flagPConClose = false;
                    $(this.playerLrc).css({
                        "width": (this.documentW() - parseInt($(this.musicPlayer).css("left")) * 2
                            - ($(this.playerHead).width() * 2)) + "px"
                    });
                }
            },
            'flagPConClose':function(newValue, oldValue){
                if (!newValue){
                    this.falgPListClose = false;
                }
            }
        },
        // vue创建后执行的函数 其中含有this => vue
        mounted() {
            let _this = this;
            // 限制歌词与控件
            _this.flagPLrcClose?_this.flagPConClose = !_this.flagPLrcClose:"";// 是否打开歌单
            // 添加第一首歌
            _this.setMusicUrl();
            // 加载完成显示播放器
            $(_this.musicPlayer).css({ 'display': 'flex' });
            // 播放器拖动
            let musicPlayerBody = new _this.BlockMove(_this.pHeadClick, function (mouse) {
                $(_this.musicPlayer).css({ "top": mouse[1], "left": mouse[0] });
                // 改变歌词宽度
                if (_this.flagPLrcClose) {
                    $(_this.playerLrc).css({
                        "width": (_this.documentW() - parseInt($(_this.musicPlayer).css("left")) * 2
                            - ($(this.playerHead).width() * 2)) + "px"
                    });
                }
                // 判断歌单展开位置
                let flag = parseInt($(_this.musicPlayer).css("top")) > (_this.documentH() / 2)
                _this.flagPConList = flag;
            }, function (mouse) {
                // 限制在屏幕中移动
                let musicScroll_headX = mouse[0] > 0 ? (mouse[0] < (_this.documentW() - $(_this.musicPlayer).outerWidth(true)) ? mouse[0] : _this.documentW() - $(_this.musicPlayer).outerWidth(true)) : 0;
                let musicScroll_headY = mouse[1] > 0 ? (mouse[1] < (_this.documentH() - $(_this.musicPlayer).outerHeight(true)) ? mouse[1] : _this.documentH() - $(_this.musicPlayer).outerHeight(true)) : 0;
                return [musicScroll_headX, musicScroll_headY];
            })

            // 默认播放器在左下角
            musicPlayerBody.setMouse([10, _this.documentH() - 60], true);

            // 时长滑动条
            let pBTimeItem = new _this.BlockMove(_this.pBTimeItem, function (mouse) {
                // 改变时间
                if (_this.canplay) {
                    let move = parseFloat(_this.aduioId.duration * mouse[0] / ($(_this.pBTime).width() - $(_this.pBTimeItem).outerWidth()));
                    // 设置移动最大时间 防止快速结束产生鬼畜
                    let timeMoveMax = _this.aduioId.duration - _this.timeMoveMax
                    move = move > timeMoveMax ? timeMoveMax : move;
                    _this.aduioId.currentTime = move;
                }
            }, function (mouse) {
                // 限制移动范围
                let moveMax = $(_this.pBTime).width() - $(_this.pBTimeItem).outerWidth();
                let move_left = (mouse[0] > 0 ? (mouse[0] < moveMax ? mouse[0] : moveMax) : "0");
                return [move_left, 0];
            }, function (flag) {
                _this.flagPlayOrPause = flag;
                _this.playOrPause();
            });
            // 音量滑动条
            let pBLoundItem = new _this.BlockMove(_this.pBLoundItem, function (mouse) {
                $(_this.pBLoundItem).css("left", mouse[0] + "px");
                $(_this.pBLoundItem + "~" + _this.pScrollBlock).css("width", (mouse[0] + $(_this.pBLoundItem).outerWidth() / 2) + "px");
                _this.aduioId.volume = (mouse[0]) / ($(_this.pBLound).width() - $(_this.pBLoundItem).outerWidth());
                // 记录音量大小
                _this.lastSound = _this.aduioId.volume;
                _this.flagSound = _this.aduioId.volume != 0;
                _this.sound();
            }, function (mouse) {
                // 限制移动范围
                let moveMax = $(_this.pBLound).width() - $(_this.pBLoundItem).outerWidth();
                let move_left = (mouse[0] > 0 ? (mouse[0] < moveMax ? mouse[0] : moveMax) : "0");
                return [move_left, 0];
            });
            // 设置初始音量
            _this.aduioId.volume = _this.musciStartVolume;
            pBLoundItem.setMouse([_this.aduioId.volume * ($(_this.pBLound).width() - $(_this.pBLoundItem).outerWidth()), 0], true);
            // 窗口大小监视
            $(window).resize(function () {
                // 改变歌词宽度
                if (_this.flagPLrcClose) {
                    $(_this.playerLrc).css({ "width": (_this.documentW() - parseInt($(_this.musicPlayer).css("left")) * 2 - 100) + "px" });
                }
                // 获取播放器当前坐标
                let musicPlayerSize = musicPlayerBody.getMouse()
                // 跑到外界拉回
                let musicPlayerXSize = _this.documentW() - (musicPlayerSize[0] + $(_this.musicPlayer).width())
                let musicPlayerYSize = _this.documentH() - (musicPlayerSize[1] + $(_this.musicPlayer).height())
                if (musicPlayerXSize < 0) {
                    musicPlayerBody.setMouse([musicPlayerSize[0] + musicPlayerXSize, musicPlayerSize[1]], true);
                }
                if (musicPlayerYSize < 0) {
                    musicPlayerBody.setMouse([musicPlayerSize[0], musicPlayerSize[1] + musicPlayerYSize], true);
                }
                // 判断歌单展开位置
                let flag = parseInt($(_this.musicPlayer).css("top")) > (_this.documentH() / 2)
                _this.flagPConList = flag
            });
            // 播放器监视
            $(_this.aduioId).on("timeupdate", function () {//时间监视
                if (_this.canplay) {
                    // 改变显示时间
                    $(_this.pBTimeNum).text(_this.changeTime(_this.aduioId.currentTime) + "/" + _this.changeTime(_this.aduioId.duration));
                    // 实时显示进度条
                    let move = parseFloat(_this.aduioId.currentTime * ($(_this.pBTime).width() - $(_this.pBTimeItem).outerWidth()) / _this.aduioId.duration);

                    let lastMouse = pBTimeItem.getMouse();

                    $(_this.pBTimeItem).css("left", lastMouse[0] + "px");
                    $(_this.pBTimeItem + "~" + _this.pScrollBlock).css("width", (lastMouse[0] + $(_this.pBTimeItem).outerWidth() / 2) + "px");
                    pBTimeItem.setMouse([move, 0], false);

                    // 加载歌词
                    if (_this.musicLrc != "") {
                        _this.musicWord = _this.musicLrc.getMusicWords(_this.aduioId.currentTime * 1000, false);
                    }
                }
            });
            // 播放器结束监视
            $(_this.aduioId).on("ended", function () {
                _this.changeMusic(1);
            });
            // 播放器能否播放监视
            $(_this.aduioId).on("canplay", function () {//时间监视
                _this.canplay = true;
            });
            // 时间轴点击
            $(_this.pBTime).on('click', function (e) {
                let move = e.offsetX - $(_this.pBTimeItem).outerWidth() / 2;
                pBTimeItem.setMouse([move, 0], true);
                _this.flagPlayOrPause = false;
                _this.playOrPause();
            });
            // 音量点击
            $(_this.pBLound).on('click', function (e) {
                let move = e.offsetX - $(_this.pBLoundItem).width() / 2;
                pBLoundItem.setMouse([move, 0], true);
            });
        },
        methods: {
            // 歌词对象
            GetMusicLrc: function (musicLrcAddress) {//[歌词地址]
                let musicArray = [];//歌词加时间毫秒级
                let musicAr = null;//艺人名
                let musicTi = null;//歌曲名
                let musicAl = null;//专辑名
                let musicBy = null;//lrc编辑者
                let musicOffset = 0;//补偿时间
                let ready_flag = 0;//是否成功读取歌词文件 0加载中 1加载成功 2加载失败 3未添加歌词
                this.getMusicAr = function () {
                    return musicAr;
                }
                this.getMusicTi = function () {
                    return musicTi;
                }
                this.getmMsicAl = function () {
                    return musicAl;
                }
                this.getMusicBy = function () {
                    return musicBy;
                }
                if (musicLrcAddress == null) {
                    ready_flag = 3;
                } else {
                    $.ajax({
                        "url": musicLrcAddress, "dataType": "text", "async": true, "success": function (text) {
                            let musicLrc = text.replace(/[\r\n]/g, "");
                            musicAr = musicLrc.match(/\[ar\:[^\[]+\]/g);
                            musicAr = musicAr == null ? null : musicAr[0].substring("[ar:".length, musicAr[0].lastIndexOf("]"));

                            musicTi = musicLrc.match(/\[ti\:[^\[]+\]/g);
                            musicTi = musicTi == null ? null : musicTi[0].substring("[ti:".length, musicTi[0].lastIndexOf("]"));

                            musicAl = musicLrc.match(/\[al\:[^\[]+\]/g);
                            musicAl = musicAl == null ? null : musicAl[0].substring("[al:".length, musicAl[0].lastIndexOf("]"));

                            musicBy = musicLrc.match(/\[by\:[^\[]+\]/g);
                            musicBy = musicBy == null ? null : musicBy[0].substring("[by:".length, musicBy[0].lastIndexOf("]"));

                            musicOffset = musicLrc.match(/\[offset\:[^\[]+\]/g);
                            musicOffset = parseInt(musicOffset == null ? 0 : musicOffset[0].substring("[offset:".length, musicOffset[0].lastIndexOf("]")));
                            let musicWords = musicLrc.match(/(\[\d{1,2}\:\d{1,2}\.\d{1,2}\])+[^\[]+/g);
                            if (musicWords != null) {
                                for (x = 0; x < musicWords.length; x++) {
                                    time = musicWords[x].match(/\[\d{2}\:\d{2}\.\d{2}\]/g);
                                    for (y = 0; y < time.length; y++) {
                                        let m = parseInt(time[y].substring(time[y].indexOf("[") + 1, time[y].lastIndexOf(":")), 10);
                                        let s = parseInt(time[y].substring(time[y].indexOf(":") + 1, time[y].lastIndexOf(".")), 10);
                                        let c = parseInt(time[y].substring(time[y].indexOf(".") + 1, time[y].lastIndexOf("]")), 10);
                                        musicArray.push([(m * 60000 + s * 1000 + c + musicOffset), musicWords[x].substring(musicWords[x].lastIndexOf("]") + 1, musicWords[x].length)])
                                    }
                                }
                                let flag = 0;
                                do {//冒泡排序
                                    flag = 0;
                                    for (x = 0; x < musicArray.length - 1; x++) {
                                        if (musicArray[x][0] > musicArray[x + 1][0]) {
                                            let center = musicArray[x + 1];
                                            musicArray[x + 1] = musicArray[x];
                                            musicArray[x] = center;
                                            flag++;
                                        }
                                    }
                                } while (flag > 0);
                                ready_flag = 1;
                            }
                        }
                        , "error": function (e) { ready_flag = 2; }
                    });
                }
                this.getMusicWords = function (time, accurate) {//[时间:毫秒][模式:精确true/大概false]
                    if (ready_flag == 0) {//0加载中 1加载成功 2加载失败 3未添加歌词
                        return "外星人正在加载歌词......";
                    } else if (ready_flag == 1 && musicArray.length != 1) {
                        if (accurate) {
                            for (x = 0; x < musicArray.length; x++) {
                                if (musicArray[x][0] == time) {
                                    return musicArray[x][1];
                                }
                            }
                            return null;
                        } else {
                            for (x = 0; x < musicArray.length - 1; x++) {
                                if (musicArray[x][0] <= time && musicArray[x + 1][0] >= time) {
                                    return musicArray[x][1];
                                }
                                if (x == musicArray.length - 2) {//最后一句
                                    return musicArray[musicArray.length - 1][1];
                                }
                            }
                            return null;
                        }
                    } else if (ready_flag == 2) {
                        return "歌词被外星人叼走了";
                    } else if (ready_flag == 3) {
                        return "未添加歌词,可能是纯音乐哟~~~";
                    }
                }
            },
            // 方块移动
            BlockMove: function (obj, doSome, moveRule, nowStatus = (flag) => { }) {//参数:绑定对象id值,移动后做什么,移动限制,现在处于什么状态,锁定时做什么
                let mouseX = 0;
                let mouseY = 0;
                let mouseAddX = 0;
                let mouseAddY = 0;
                let flagMove = false;
                let flagLock = false;
                $(obj).mousedown(function (e) {
                    flagMove = true;
                    mouseAddX = e.pageX - mouseX;
                    mouseAddY = e.pageY - mouseY;
                    nowStatus(true);
                });
                $(window).mouseup(function () {
                    if (flagMove) {
                        flagMove = false;
                        nowStatus(false);
                    }
                })
                $(window).mousemove(function (e) {
                    if (flagMove) {
                        mouseX = e.pageX - mouseAddX;
                        mouseY = e.pageY - mouseAddY;
                        if (moveRule) {
                            let resoult = moveRule([mouseX, mouseY]);
                            mouseX = resoult[0];
                            mouseY = resoult[1];
                        }
                        doSome([mouseX, mouseY]);
                    }
                });
                this.setMouse = function (mouse, flag) {
                    if (moveRule) {
                        let resoult = moveRule(mouse);
                        mouseX = resoult[0];
                        mouseY = resoult[1];
                    }
                    if (flag) {
                        doSome([mouseX, mouseY]);
                    }
                }
                this.getMouse = function () {
                    return [mouseX, mouseY];
                }
                this.setLock = function (flag) {
                    flagLock = flag;
                    lockDo(flagLock)
                }
            },
            // 开关控件
            pConCloseFun: function (e) {
                if (!this.flagPLrcClose) {
                    this.flagPConClose = !this.flagPConClose
                }
            },
            // 开关歌词
            pLrcCloseFun: function (e) {
                this.flagPLrcClose = !this.flagPLrcClose
            },
            // 开关列表
            pListCloseFun: function (e) {
                this.falgPListClose = !this.falgPListClose
            },
            // 浏览器的宽高
            documentW: function () {
                return document.documentElement.clientWidth;
            },
            documentH: function () {
                return document.documentElement.clientHeight;
            },
            // 添加歌曲
            setMusicUrl: function () {
                if (this.musicList.length > 0) {
                    this.canplay = false;// 重新加载
                    $(this.aduioId).attr("src", this.musicList[this.nowMusicNumber].musicUrl);
                    this.musicLrc = new this.GetMusicLrc(this.musicList[this.nowMusicNumber].musicLrc);
                }
            },
            // 切换歌曲 编号 模式
            setMusicNumber: function (num, flag = false) {
                let musicLength = this.musicList.length // 歌单长度
                if (flag) {// 绝对
                    this.nowMusicNumber = num > 0 ? (num < musicLength ? num : musicLength) : 0;
                } else {// 相对
                    this.nowMusicNumber += num;
                    this.nowMusicNumber = this.nowMusicNumber >= 0 ? (this.nowMusicNumber < musicLength ? this.nowMusicNumber : 0) : musicLength - 1;
                }
                if (musicLength > 0) {
                    this.setMusicUrl();
                    // 如果还在播放则继续
                    this.flagPlayOrPause = true;
                    this.aduioId.play();
                }
            },
            // 切换上下首
            changeMusic: function (num) {
                if (this.musicPlayerMode == 0) {
                    this.setMusicNumber(num);
                } else if (this.musicPlayerMode == 1) {
                    let random;
                    do {
                        random = Math.floor(Math.random() * (this.musicModeList.length + 1));
                    } while (random == this.nowMusicNumber);
                    this.setMusicNumber(random, true);
                } else if (this.musicPlayerMode == 2) {
                    this.setMusicNumber(0);
                }
            },
            // 暂停开始
            playOrPause: function () {
                this.flagPlayOrPause = !this.flagPlayOrPause
                if (this.flagPlayOrPause && this.canplay) {
                    this.aduioId.play();
                } else {
                    this.aduioId.pause();
                }
            },
            changeMode: function () {
                this.musicPlayerMode++;
                this.musicPlayerMode = this.musicPlayerMode % this.musicModeList.length;
            },
            //将秒转换为分钟制
            changeTime: function (time) {//[数值:秒]
                if (time > 0) {
                    let minute = parseInt(time / 60);
                    let seconds = parseInt(time - minute * 60);
                    return (minute < 10 ? "0" + minute : minute) + ":" + (seconds < 10 ? "0" + seconds : seconds);
                } else {
                    return "00:00";
                }
            },
            // 单双击
            pBHeadClick: function () {
                if (this.timer) {
                    clearTimeout(this.timer);
                    this.timer = null;
                    this.setMusicNumber(1);
                } else {
                    this.timer = setTimeout(() => {
                        this.playOrPause();
                        clearTimeout(this.timer);
                        this.timer = null;
                    }, this.dClickSensitive);
                }
            },
            // 静音
            sound: function () {
                this.flagSound = !this.flagSound;
                if (this.flagSound) {
                    this.lastSound = this.aduioId.volume;
                    this.aduioId.volume = 0;
                } else {
                    this.aduioId.volume = this.lastSound;
                }
            }
        }
    })
})
