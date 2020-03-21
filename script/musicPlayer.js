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
            lrcTimeDeviation: 150,// 歌词模糊时间 audio 的 timeupdate 监视 大概是300ms执行一次 所以 此模糊值为一半150;不然歌词不准确.
            flagSound: false,// 是否静音
            nowMusicNumber: 0, // 现在在播放的编号
            musicPlayerMode: 0,// 播放模式 // 0:循环播放 1:随机播放 2:单曲循环
            timeMoveMax: 3,// 时间最多拖动到结束的前几秒
            musciStartVolume: 0.5,// 初始音量
            dClickSensitive: 400,// 双击检测灵敏度
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
                musiLrc:'',// 歌词lrc文件
                musicUrl:'',// 歌曲url
            }
            注意: 可以异步加载数据到 musicList数组中.
            */
            // 不可修改
            flagPlayOrPause: false,// 播放还是暂停
            flagPConList: true,// 歌单是下展开还是上展开-会自动修改
            lastSound: 0.5,// 静音时的音量
            musicLrc: "",// 歌词解析对象
            musicWord: "",// 歌词
            timer: null,// 单双击冲突
            canplay: false,// 是否能够播放
            musicModeList: ['pBAgain', 'pBRandom', 'pBOnly'],// 循环播放 随机播放  单曲循环
            musicModeName: ['循环', '随机', '单曲'],
        },
        // vue创建后执行的函数 其中含有this => vue
        mounted() {
            let _this = this;
            // 限制歌词与控件
            _this.flagPLrcClose ? _this.flagPConClose = !_this.flagPLrcClose : "";// 是否打开歌单
            // 添加第一首歌
            _this.setMusicUrl();
            // 加载完成显示播放器
            $(_this.$refs.musicPlayer).css({ 'display': 'flex' });
            // 播放器拖动
            let musicPlayerBody = new _this.BlockMove(_this.$refs.pHeadClick, function (mouse) {
                $(_this.$refs.musicPlayer).css({ "top": mouse[1], "left": mouse[0] });
                // 改变歌词宽度
                if (_this.flagPLrcClose) {
                    $(_this.$refs.playerLrc).css({
                        "width": (_this.documentW() - parseInt($(_this.$refs.musicPlayer).css("left")) * 2
                            - ($(_this.$refs.playerHead).width() * 2)) + "px"
                    });
                }
                // 判断歌单展开位置
                let flag = parseInt($(_this.$refs.musicPlayer).css("top")) > (_this.documentH() / 2)
                _this.flagPConList = flag;
            }, function (mouse) {
                // 限制在屏幕中移动
                let musicScroll_headX = mouse[0] > 0 ?
                    (mouse[0] < (_this.documentW() - $(_this.$refs.musicPlayer).outerWidth(true)) ?
                        mouse[0] : _this.documentW() - $(_this.$refs.musicPlayer).outerWidth(true)) : 0;
                let musicScroll_headY = mouse[1] > 0 ?
                    (mouse[1] < (_this.documentH() - $(_this.$refs.musicPlayer).outerHeight(true)) ?
                        mouse[1] : _this.documentH() - $(_this.$refs.musicPlayer).outerHeight(true)) : 0;
                return [musicScroll_headX, musicScroll_headY];
            })

            // 默认播放器在左下角
            musicPlayerBody.setMouse([10, _this.documentH() - 60], true);

            // 时长滑动条
            let pBTimeItem = new _this.BlockMove(_this.$refs.pBTimeItem, function (mouse) {
                // 改变时间
                if (_this.canplay) {
                    let move = parseFloat(_this.$refs.aduioId.duration * mouse[0] / _this.getPBTimeRealyWidth());
                    // 设置移动最大时间 防止快速结束产生鬼畜
                    let timeMoveMax = _this.$refs.aduioId.duration - _this.timeMoveMax
                    move = move > timeMoveMax ? timeMoveMax : move;
                    _this.$refs.aduioId.currentTime = move;
                }
            }, function (mouse) {
                // 限制移动范围
                let moveMax = $(_this.$refs.pBTime).width() - $(_this.$refs.pBTimeItem).outerWidth();
                let move_left = (mouse[0] > 0 ? (mouse[0] < moveMax ? mouse[0] : moveMax) : "0");
                return [move_left, 0];
            }, function (flag) {
                _this.flagPlayOrPause = flag;
                _this.playOrPause();
            });
            // 音量滑动条
            let pBLoundItem = new _this.BlockMove(_this.$refs.pBLoundItem, function (mouse) {
                $(_this.$refs.pBLoundItem).css("left", mouse[0] + "px");
                $(_this.$refs.loundScroll).css("width", (mouse[0] + $(_this.$refs.pBLoundItem).outerWidth() / 2) + "px");
                _this.$refs.aduioId.volume = (mouse[0]) / _this.getPBLoundRealyWidth();
                // 记录音量大小
                _this.lastSound = _this.$refs.aduioId.volume;
                _this.flagSound = _this.$refs.aduioId.volume != 0;
                _this.sound();
            }, function (mouse) {
                // 限制移动范围
                let moveMax = $(_this.$refs.pBLound).width() - $(_this.$refs.pBLoundItem).outerWidth();
                let move_left = (mouse[0] > 0 ? (mouse[0] < moveMax ? mouse[0] : moveMax) : "0");
                return [move_left, 0];
            });
            // 设置初始音量以及样式
            _this.$refs.aduioId.volume = _this.musciStartVolume;
            let startMouse = [_this.$refs.aduioId.volume * _this.getPBLoundRealyWidth(), 0];
            pBLoundItem.setMouse(startMouse, true);
            // 窗口大小监视
            $(window).resize(function () {
                // 改变歌词宽度
                if (_this.flagPLrcClose) {
                    $(_this.$refs.playerLrc).css({
                        "width":
                            (_this.documentW() - parseInt($(_this.$refs.musicPlayer).css("left")) * 2 - 100) + "px"
                    });
                }
                // 获取播放器当前坐标
                let musicPlayerSize = musicPlayerBody.getMouse()
                // 跑到外界拉回
                let musicPlayerXSize = _this.documentW() - (musicPlayerSize[0] + $(_this.$refs.musicPlayer).width())
                let musicPlayerYSize = _this.documentH() - (musicPlayerSize[1] + $(_this.$refs.musicPlayer).height())
                if (musicPlayerXSize < 0) {
                    musicPlayerBody.setMouse([musicPlayerSize[0] + musicPlayerXSize, musicPlayerSize[1]], true);
                }
                if (musicPlayerYSize < 0) {
                    musicPlayerBody.setMouse([musicPlayerSize[0], musicPlayerSize[1] + musicPlayerYSize], true);
                }
                // 判断歌单展开位置
                let flag = parseInt($(_this.$refs.musicPlayer).css("top")) > (_this.documentH() / 2)
                _this.flagPConList = flag
            });
            // 播放器监视
            $(_this.$refs.aduioId).on("timeupdate", function () {//时间监视
                if (_this.canplay) {
                    // 改变显示时间
                    $(_this.$refs.pBTimeNum).text(_this.changeTime(_this.$refs.aduioId.currentTime) +
                        "/" + _this.changeTime(_this.$refs.aduioId.duration));
                    // 实时显示进度条
                    let move = parseFloat(_this.$refs.aduioId.currentTime * _this.getPBTimeRealyWidth() / _this.$refs.aduioId.duration);

                    let lastMouse = pBTimeItem.getMouse();

                    $(_this.$refs.pBTimeItem).css("left", lastMouse[0] + "px");
                    $(_this.$refs.timeScroll).css("width", (lastMouse[0] + $(_this.$refs.pBTimeItem).outerWidth() / 2) + "px");
                    pBTimeItem.setMouse([move, 0], false);

                    // 加载歌词
                    if (_this.musicLrc != "") {
                        _this.musicWord = _this.musicLrc.getWord(_this.$refs.aduioId.currentTime * 1000, true, _this.lrcTimeDeviation);;
                    }
                }
            });
            // 播放器结束监视
            $(_this.$refs.aduioId).on("ended", function () {
                _this.changeMusic(1);
            });
            // 播放器能否播放监视
            $(_this.$refs.aduioId).on("canplay", function () {//时间监视
                _this.canplay = true;
            });
            // 时间轴点击
            $(_this.$refs.pBTime).on('click', function (e) {
                let move = e.offsetX - $(_this.$refs.pBTimeItem).outerWidth() / 2;
                pBTimeItem.setMouse([move, 0], true);
                _this.flagPlayOrPause = false;
                _this.playOrPause();
            });
            // 音量点击
            $(_this.$refs.pBLound).on('click', function (e) {
                let move = e.offsetX - $(_this.$refs.pBLoundItem).width() / 2;
                pBLoundItem.setMouse([move, 0], true);
            });
        },
        methods: {
            // 方块拖动
            BlockMove: function (obj, doSome, moveRule, nowStatus = (flag) => { }) {
                //参数:绑定对象,移动后做什么,移动限制,现在处于什么状态,锁定时做什么
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
                    this.flagPConClose = !this.flagPConClose;
                    if (!this.flagPConClose) {
                        this.falgPListClose = false;
                    }
                }
            },
            // 开关歌词
            pLrcCloseFun: function (e) {
                this.flagPLrcClose = !this.flagPLrcClose;
                if (!this.flagPLrcClose) {
                    $(this.$refs.playerLrc).css({ "width": "0px" });
                } else {
                    this.flagPConClose = false;
                    this.falgPListClose = false;
                    $(this.$refs.playerLrc).css({
                        "width": (this.documentW() - parseInt($(this.$refs.musicPlayer).css("left")) * 2
                            - ($(this.$refs.playerHead).width() * 2)) + "px"
                    });
                }
            },
            // 开关列表
            pListCloseFun: function (e) {
                this.falgPListClose = !this.falgPListClose
            },
            // 获取时间滑动条的最大可移动距离
            getPBTimeRealyWidth: function () {
                return ($(this.$refs.pBTime).width() - $(this.$refs.pBTimeItem).outerWidth());
            },
            // 获取音量滑动条的最大可移动距离
            getPBLoundRealyWidth: function () {
                return ($(this.$refs.pBLound).width() - $(this.$refs.pBLoundItem).outerWidth());
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
                    $(this.$refs.aduioId).attr("src", this.musicList[this.nowMusicNumber].musicUrl);
                    this.musicLrc = new Lrc(this.musicList[this.nowMusicNumber].musicLrc);
                    this.musicLrc.getLrc();
                }
            },
            // 切换歌曲 编号 模式
            setMusicNumber: function (num, flag = false) {
                let musicLength = this.musicList.length // 歌单长度
                if (flag) {// 绝对
                    this.nowMusicNumber = num > 0 ? (num < musicLength ? num : musicLength) : 0;
                } else {// 相对
                    this.nowMusicNumber += num;
                    this.nowMusicNumber = this.nowMusicNumber >= 0 ?
                        (this.nowMusicNumber < musicLength ?
                            this.nowMusicNumber : 0) : musicLength - 1;
                }
                if (musicLength > 0) {
                    this.setMusicUrl();
                    // 如果还在播放则继续
                    this.flagPlayOrPause = true;
                    this.$refs.aduioId.play();
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
                    this.$refs.aduioId.play();
                } else {
                    this.$refs.aduioId.pause();
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
                    this.lastSound = this.$refs.aduioId.volume;
                    this.$refs.aduioId.volume = 0;
                } else {
                    this.$refs.aduioId.volume = this.lastSound;
                }
            }
        }
    })
})
