/**
 * Created by jinle.li on 2016/7/13.
 * @name upload.js
 * @author Jinke.Li  https://github.com/lijinke666
 * 图片裁剪 & 文件上传 小插件,
 * 支持拖拽,粘贴,上传进度
 * 代码为早期编写,十分丑陋,仅供学习玩耍
 * v 0.6.0
 *  : )
 */

;(function (win, $) {
    /**
     * 
     * @param {Object} root  入口容器
     * @param {Object} message 自定义消息提示 
     * message.success
     * message.error
     */
    var Upload = function (root, message) {
        this.element = root;
        var defaultsMessage = {
            notice: this.notice
        };
        this.message = $.extend(defaultsMessage, message);
        this.errorNotice = this.message.notice;
    };
    Upload.prototype = {
        files: null,
        scale: 1.0,          //缩放比例
        maxScale: 3.0,        //最大缩放
        range: 0.05,          //每次缩放的量
        fileSize: 0,           //多图上传 所有文件的大小
        multipleNum: 0,         //多图上传 文件个数
        mouseOffsetX: 0,
        mouseOffsetY: 0,
        isDown:false,
        fileTypeConfig: {
            "img": "图片",
            "file": "文件"
        },
        //是否为PC   返回 true 或 false
        isPc: (function (nav) {
            var userAgent = nav.userAgent;
            var AgentsArray = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod"];
            var flag = true;
            for (var i = 0; i < AgentsArray.length; i++) {
                if (userAgent.indexOf(AgentsArray[i]) > -1) {
                    flag = false;
                    break;
                }
            }
            return flag;
        })(navigator),

        /**
         * 加载提示
         * @param msg  loading动画 文字信息
         */
        loading: function (msg) {
            msg = msg ? msg : '请稍后';
            var list = "";
            for (var i = 1; i <= 12; i++) {
                list += "<div class='sk-circle" + i + " sk-child'></div>";
            }
            var doms = $("" +
                "<div class='removeLoading ljkPopup modal' style='display: block'><div class='mask'><div class='loading'>" +
                "<div class='sk-circle'>" + list + "</div><p class='text-center fz18 color-white mt30'>" + msg + "</p></div></div>");
            $("body").append(doms);
        },

        /**
         * 通知消息
         * @param msg             提示信息
         * @param onHideHandler   回调函数
         * @param title            标题
         * @param showTime        显示时间
         */
        notice: function (msg, showTime, onHideHandler, title) {
            title = title ? title : '提示';
            var $dom = $('<div class="ljkPopup modal" style="display:block"><div class="mask"></div><div class="ljkPopup-wrap modal-wrap ctrl-modal"><div class="modal-title"><h2 class="none">' + title + '</h2></div><table><tr><td><h1 class="none mt20">' + msg + '</h1></td></tr></table></div></div>');
            $('body').append($dom);

            if (typeof showTime == 'undefined') {
                showTime = 1500;
            } else {
                showTime = Math.max(parseInt(showTime), 1500);
            }
            var i = setTimeout(function () {
                clearTimeout(i);
                setTimeout(function () {
                    $dom.remove();
                    if (typeof (onHideHandler) == 'function') {
                        onHideHandler();
                    }
                }, 500);
                $dom.css('opacity', 0);
            }, showTime);
        },

        //删除loading动画
        removeLoading: function () {
            $('.removeLoading').remove();
        },
        //绑定文件按钮点击事件
        selectImg: function (options) {
            if (typeof options != "object") {
                return;
            }
            options.fileSelectBtn
                ? options.fileSelectBtn.on("click", function () {
                    options.fileBtn.click();
                })
                : options.fileBtn.click();

        },
        //获取元素位置信息
        getBoundingClientRect: function (ele) {
            var gbc = ele.getBoundingClientRect();
            return {
                left: gbc.left,
                top: gbc.top
            }
        },

        /**
         *拖拽图片
         * @param ele      拖拽区域
         */
        moveImage: function (options) {
            if (typeof options != "object") {
                return
            }
            var isPc = this.isPc;
            var _this = this
            //按下
            options.ele.on(isPc ? "mousedown" : "touchstart", function (e) {
                var touche = isPc ? e : (e.originalEvent.targetTouches[0] || e.targetTouches[0]);
                _this.isDown = true;
                _this.mouseOffsetX = touche.pageX - ~~(this.getBoundingClientRect(options.ele.get(0)).left);
                _this.mouseOffsetY = touche.pageY - ~~(this.getBoundingClientRect(options.ele.get(0)).top);
            });
            //离开
            options.ele.on(isPc ? "mousemove" : "touchmove", function (e) {
                e.preventDefault();
                var mouseX = 0,
                    mouseY = 0;
                var touche = isPc ? e : (e.originalEvent.touches[0] || e.originalEvent.changedTouches[0] || e.targetTouches[0]);
                if (_this.isDown === true) {
                    mouseX = touche.pageX - _this.mouseOffsetX;
                    mouseY = touche.pageY - _this.mouseOffsetY;
                    options.ele.css({
                        top: mouseY + "px",
                        left: mouseX + "px"
                    })
                }
            });
            //弹起
            options.ele.on(isPc ? "mouseup" : "touchend", function (e) {
                e.preventDefault();
                _this.isDown = false;
            });
            //移出
            options.ele.on(isPc ? "mouseout" : "touchcancel", function (e) {
                e.preventDefault();
                _this.isDown = false;
            });
        },

        /**
         * 展示图片
         * @param fileSelectBtn     文件美化后的选择按钮 可不选
         * @param fileBtn     文件按钮
         * @param showEle     图片显示区域
         * @param maxSize     图片最大限制  KB
         * @param zoom        缩放    默认false
         * @param callback    回调    返回base64图片
         */
        showImage: function (options) {
            var defaults = {
                maxSize: 1024,
                zoom: false
            };
            var options = $.extend(defaults, options);
            if (typeof options != "object") {
                return
            }
            var _this = this;

            //绑定文件按钮点击事件
            _this.selectImg(options);
            //获取到文件时

            _this.getFileInfo(options.fileBtn, options.maxSize, _this.fileTypeConfig['img'], false, function (data) {
                _this.resetScale(options.range, options.showEle);
                _this.appendImage(data.result, options.fileSelectBtn, options.showEle, function (result) {
                    options.callback && options.callback(result);
                });
                options.zoom === true && _this.bindMouseWheel(options.range, options.showEle);
                options.fileBtn.blur();
            })
        },
        //重置比例
        resetScale: function (range, showEle) {
            range && range.val(1.0);
            this.ToScale(showEle, 1.0);
        },
        //添加图片节点
        appendImage: function (result, fileSelectBtn, showEle, callback) {
            this.loadImage(result).then(function (image) {
                fileSelectBtn && fileSelectBtn.addClass("success-linear");
                showEle.html('').append(image).removeClass("hasImg");
                callback && callback(result);
            }).catch(function (e) {
                this.errorNotice('添加图片节点出错!')
                throw new Error(e);
            })
        },
        //绑定鼠标滚轮事件
        bindMouseWheel: function (rangeEle, showEle) {
            var _this = this,
                maxScale = _this.maxScale,
                range = _this.range;

            //取整 parseInt ||  >>0  ||  ~~ 都可以
            showEle.get(0).onmousewheel = function (e) {
                var scale = _this.scale;
                var target,
                    ee = e || window.event;
                target = ee.delta ? ee.delta : ee.wheelDelta;    //火狐有特殊
                if (target > 0) {
                    scale += range;
                    scale = Math.min(scale, maxScale);
                    rangeEle && rangeEle.val(scale);
                    _this.ToScale(showEle, scale);
                } else if (target < 0) {
                    scale -= range;
                    scale = Math.max(0, scale);
                    rangeEle && rangeEle.val(scale);
                    _this.ToScale(showEle, scale);
                } else {
                    return false;
                }
            };
        },
        //拿到文件信息
        getFileInfo: function (fileBtn, maxSize, fileType, multiple, callback) {
            var _this = this;
            fileType = fileType || _this.fileTypeConfig['file'];
            fileBtn.on('change', function () {
                if (!window.FileReader) {
                    _this.errorNotice("浏览器版本过低");
                    return;
                };
                //将对象转换为数组 Array.prototype.slice.call(obj);
                //对象没有slice方法 所以通过Array的原型上的slice 通过call改变this指针
                //ES6中可以写成  Array.from(obj);
                _this.files = Array.prototype.slice.call(this.files);

                _this.filterFileInfo(_this.files, fileType, maxSize, multiple, function (data) {
                    callback(data);
                })
            })

        },
        //过滤文件信息
        filterFileInfo: function (fileList, fileType, maxSize, multiple, callback) {
            var _this = this;
            multiple = multiple || false
            if (!multiple) {
                if (fileList.length && fileList.length > 1) {
                    fileType == _this.fileTypeConfig['img']
                        ? _this.errorNotice("只能上传1张图片:)")
                        : _this.errorNotice("只能上传1个文件:)");
                    return;
                }
            }
            fileList.forEach(function (file, i) {
                //jpeg png gif    like  "/images/jpeg"     i对大小写不敏感
                _this.readerImage(fileType, file, maxSize, function (fileInfo) {
                    callback(fileInfo)
                })
            })
        },
        /**
         * 读取文件信息
         * @param {String} fileType file | img 文件还是图片
         * @param {Object} file  文件
         * @param {Number} maxSize 图片大小限制 (kb)
         * @param {Function} callback 回调 返回文件信息
         */
        readerImage: function (fileType, file, maxSize, callback) {
            var _this = this
            //jpeg jpg png gif    like  "/images/jpeg"     i对大小写不敏感
            if (fileType == _this.fileTypeConfig['img']) {
                var reg = /\/(?:jpeg|jpg|png|gif)/i;          //图片
                var type = file.type.split("/").pop();
                // var type = file.type.match(/image\/(\w*)/)[1];    //获取文件的类型
                if (!reg.test(file.type)) {
                    _this.errorNotice("不支持" + (!!type ? type : '这种') + "格式的" + (!!type ? fileType : '文件') + "哟");
                    return;
                }
            }
            if (maxSize != 'undefined' && typeof maxSize == 'number') {
                var fileSize = file.size / 1024;
                if (fileSize > maxSize) {
                    _this.errorNotice("抱歉," + fileType + " 最大为 " + maxSize + " KB");
                    return;
                }
            }
            //HTML 5.1  新增file接口
            var reader = new FileReader();

            //读取中
            reader.onprogress = function () {
                _this.loading("读取中,请稍后");
            };
            //读取失败
            reader.onerror = function () {
                _this.removeLoading();
                _this.errorNotice("读取失败");
            };
            //读取中断
            reader.onabort = function () {
                _this.removeLoading();
                _this.errorNotice("网络异常!");
            };
            //读取成功
            reader.onload = function () {
                _this.removeLoading();
                var result = this.result;        //读取失败时  null   否则就是读取的结果
                callback && callback({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    result: result
                })
            };
            reader.readAsDataURL(file);      //base64
        },
        //异步加载图片
        loadImage: function (src) {
            return new Promise(function (res, rej) {
                var img = new Image();
                img.src = src;
                img.onload = function () {
                    res(img);
                };
                img.onerror = function () {
                    rej(e);
                }
            })
        },

        /**
         * 滑块拖拽缩放
         * @param range   滑块
         * @param scale   缩放比例
         * @param ele     什么区域进行缩放
         */
        rangeToScale: function (options) {
            if (typeof options != "object") {
                return;
            }
            var _this = this;
            var isPc = this.isPc;
            var scale = _this.scale;
            options.range.on(isPc ? "mousemove " : "touchmove", function (e) {
                var _this_ = $(this);
                scale = Number(_this_.val());
                changeRange(scale);
            }).prev().on(isPc ? "mouseover " : "touchstart", function () {
                scale -= 0.01;
                changeRange(scale);
            }).next().next().on(isPc ? "mouseover" : "touchstart", function () {
                scale += 0.01;
                changeRange(scale);
            });
            var changeRange = function (scale) {
                options.range && options.range.val(scale);
                _this.ToScale(options.ele, scale);
            }
        },

        /**
         * 缩放
         * @param ele     什么区域进行缩放
         * @param scale   缩放比例
         */
        ToScale: function (ele, scale) {
            ele.css({
                "-webkit-transform": "scale(" + scale + ")",
                "-moz-transform": "scale(" + scale + ")",
                "-ms-transform": "scale(" + scale + ")",
                "-o-transform": "scale(" + scale + ")",
                "transform": "scale(" + scale + ")"
            })
            this.scale = scale
        },
        /**
         * 裁剪图片
         * @param uploadBtn  上传按钮
         * @param uploadImageBox  拖拽区域
         * @param clipImage  裁剪区域
         * @param range  滑块
         * @param quality  压缩比例
         * @param clipSuccess  成功callback
         * @param clipError  失败callback
         */
        clipImage: function (options) {
            var _this = this;
            if (typeof options != "object") {
                return;
            };
            var defaults = {
                uploadBtn: $(".upload-upload-btn"),
                uploadImageBox: $(".move-image"),
                clipImage: $(".clip-image"),
                range: $("#range")
            };
            var options = $.extend(defaults, options);
            _this.canvas = document.createElement("canvas");
            //选择图片

            options.uploadBtn.on("click", function () {
                try {
                    if (options.uploadImageBox.hasClass("hasImg")) {
                        _this.errorNotice("请选择图片");
                        return;
                    }
                    var $img = options.uploadImageBox.find("img"),
                        cxt = _this.canvas.getContext("2d"),
                        $width = options.clipImage.width(),
                        $height = options.clipImage.height();
                    _this.canvas.width = $width;
                    _this.canvas.height = $height;

                    var scale = options.range.val() || options.range.value,
                        sx = ~~(options.clipImage.offset().left - options.uploadImageBox.offset().left),
                        sy = ~~(options.clipImage.offset().top - options.uploadImageBox.offset().top);
                    // image 图片元素，除了图片，还支持其他 3 种格式，分别是 HTMLVideoElement HTMLCanvasElement ImageBitmap ，
                    // sx 要绘制到 canvas 画布的源图片区域（矩形）在 X 轴上的偏移量（相对源图片左上角）
                    // sy 与 sx 同理，只是换成 Y 轴
                    // sWidth 要绘制到 canvas 画布中的源图片区域的宽度，如果没有指定这个值，宽度则是 sx 到图片最右边的距离
                    // sHeight 要绘制到画布中的源图片区域的高度，如果没有指定这个值，高度则是 sy 到图片最下边的距离
                    // dx 源图片左上角在 canvas 画布 X 轴上的偏移量
                    // dy 源图片左上角在画布 Y 轴上的偏移量
                    // dWidth 绘制图片的 canvas 画布宽度
                    // dHeight 绘制图片的画布高度
                    cxt.drawImage($img.get(0), sx / scale, sy / scale, $width / scale, $height / scale, 0, 0, $width, $height);

                    var imageType = (options.quality && typeof (options.quality) === 'number') ? 'image/jpeg' : 'image/png';
                    //toDataURL  param1 文件类型 param2 质量  当第二参数为正时 param1 只能是 jpeg|webp
                    var Src = _this.canvas.toDataURL(imageType, Number(options.quality));
                    delete this.canvas;
                    if (typeof options.clipSuccess != "function") {
                        throw new Error("请使用clipSuccess回调函数:(");
                    };
                    options.clipSuccess(Src);
                } catch (e) {
                    options.clipError('error:' + e);
                }
            })
        },
        //图片裁剪上传
        clipUpload: function (options) {
            var defaults = {
                maxSize: 1024,
                drag: true,
                zoom: true,
                paste: true,
                dragAreaActiveClassName: "dragActive",
                success: function () { },
                error: function () { }
            };
            var _this = this
            var options = $.extend(defaults, options);
            //拖拽图片
            this.moveImage({
                ele: options.showEle
            });
            //预览图片
            this.showImage({
                range: options.range,
                fileSelectBtn: options.fileSelectBtn,
                fileBtn: options.fileBtn,
                showEle: options.showEle,
                maxSize: options.maxSize,
                zoom: options.zoom
            });
            //滑竿缩放图片
            this.rangeToScale({
                range: options.range,
                ele: options.showEle
            });
            //裁剪图片
            this.clipImage({
                range: options.range,
                quality: options.quality,
                clipSuccess: function (Src) {
                    options.success(Src);
                },
                clipError: function (e) {
                    options.error(e);
                }
            });
            //拖拽添加图片
            options.drag === true && options.dragArea && this.addListener({
                type: this.fileTypeConfig['img'],
                fileBtn: options.fileBtn,
                dragArea: options.dragArea,
                fileArea: options.showEle,
                maxSize: options.maxSize,
                range: options.range,
                dragAreaActiveClassName: options.dragAreaActiveClassName,
                callback: function (data) {
                    _this.appendImage(data.result, options.fileSelectBtn, options.showEle);
                }
            })
            //粘贴添加图片
            options.paste === true && this.addPasteListener(function (file) {
                _this.readerImage(_this.fileTypeConfig['img'], file, options.maxSize, function (data) {
                    _this.appendImage(data.result, options.fileSelectBtn, options.showEle)
                    options.zoom === true && _this.bindMouseWheel(options.range, options.showEle);
                });
            })

        },
        /**
         * 添加粘贴事件
         * @param {Function} callback 回调 
         * return 粘贴的文件
         */
        addPasteListener: function (callback) {
            var _this = this;
            $(document.body).on('paste', function (e) {
                var clipboardData = window.clipboardData || e.originalEvent.clipboardData;
                var items = clipboardData.items;         //文件
                var types = clipboardData.types || [];   //文件类型
                if (!items) return;

                var item = items[0],
                    kind = item.kind,
                    type = item.type;     //kind 种类 type 格式 
                if (kind.toLocaleLowerCase() != "file") return _this.errorNotice('文件类型不正确！');
                callback && callback(item.getAsFile())
            })
        },
        //上传文件
        uploadFile: function (fileUploadBtn, form, url, attr, progressCallback, errCallback, successCallback) {
            var xhr = new XMLHttpRequest();
            fileUploadBtn.on('click', function () {
                var formData = form ? new FormData(form[0]) : new FormData();
                if (attr) {
                    var key = Object.keys(attr)[0];
                    !form && attr && formData.append(Object.keys(attr)[0], attr[key]);
                }

                xhr.onloadstart = function () {
                    console.log("开始上传...");
                };
                xhr.onerror = function (e) {
                    _this.errorNotice('上传失败!')
                    errCallback && errCallback(e);
                };
                xhr.onload = function () {
                    var result = JSON.parse(xhr.responseText);
                    successCallback && successCallback(result);
                };
                xhr.onabort = function (event) {
                    _this.errorNotice('上传中断!');
                };
                xhr.ontimeout = function () {
                    _this.errorNotice('连接超时!');
                };
                xhr.onloadend = function () {
                    console.log('传输结束');
                };
                xhr.upload.onprogress = function (e) {
                    console.info('上传中...');
                    var progress = Math.round(e.loaded * 100 / e.total);
                    progressCallback && progressCallback(progress);
                };

                xhr.open('POST', url, true);
                xhr.send(formData);
            });
        },
        //文件上传(带进度条)
        fileUpload: function (options) {
            var defaults = {
                maxSize: 1024,
                onChange: function () { },
                progress: function () { },
                error: function () { },
                success: function () { }
            };
            var options = $.extend(defaults, options);
            var _this = this;
            if (!options.url) throw new Error('No upload address specified');
            //绑定事件
            _this.selectImg(options);

            // 获取到文件时
            _this.getFileInfo(options.fileBtn, options.maxSize, _this.fileTypeConfig['file'], false, function (result) {
                options.onChange && options.onChange(result);
                _this.uploadFile(
                    options.fileUploadBtn,
                    options.form,
                    options.url,
                    undefined,
                    options.progress,
                    options.error,
                    options.success
                );
            });
            options.drag === true && options.dragArea && _this.addListener(
                $.extend(options, { type: _this.fileTypeConfig['file'] })
            );
        },
        /**
         * 粘贴,拖拽,选择三个共同的事件
         * 绑定 remove , change ,append 三个事件
         * 这里写晕了 代码的耦合有点严重 :(
         */
        bindmultipleEvent: function (id, data, fileBtn, fileSelectBtn, multipleSection, onChange) {
            var _this = this,
                size = ~~(data.size / 1024);
            var showEle = _this.createMultipleItem(++id, size);
            multipleSection.append(showEle.item);
            _this.appendImage(data.result, fileSelectBtn, showEle.warp);
            _this.multipleSizeChange(onChange, data, size, 1, true);
            _this.removeMultipleItem(showEle.remove, function () {
                _this.multipleSizeChange(onChange, data, size, _this.multipleNum, false);
            });
            fileBtn.blur();
        },
        /**
         * 多图上传
         * @param {Number} maxsize 单张图片大小限制
         * @param {Boolean} drag   是否拖拽  默认 true
         * @param {Boolean} paste  是否支持粘贴 默认 true
         * @param {Object} multipleSection 图片放置的容器 默认 '.multiple-list'
         * @param {String} dragAreaActiveClassName  拖拽获取焦点的容器样式 默认 'multiple-area-active'
         * @param {Function} onChange  图片数量改变回调 返回图片信息
         */
        multipleUpload: function (options) {
            var defaults = {
                maxSize: 1024,
                drag: true,
                paste: true,
                multipleSection: $('.multiple-list'),
                dragAreaActiveClassName: "multiple-area-active",
                onChange: function () { }
            };
            var multipleSection = options.multipleSection;
            var options = $.extend(defaults, options);
            var _this = this;
            var id = 0;   //图片id
            _this.selectImg(options);

            //数字1  代表 每次图片数 -1
            //true 增加 false 减少

            // //添加图片节点
            _this.getFileInfo(options.fileBtn, options.maxSize, _this.fileTypeConfig['img'], true, function (data) {
                _this.bindmultipleEvent(id, data, options.fileBtn, options.fileSelectBtn, multipleSection, options.onChange);
            });

            //绑定粘贴事件
            options.paste === true && this.addPasteListener(function (file) {
                _this.readerImage(_this.fileTypeConfig['img'], file, options.maxSize, function (data) {
                    _this.bindmultipleEvent(id, data, options.fileBtn, options.fileSelectBtn, multipleSection, options.onChange);
                });
            });

            //绑定拖拽事件
            if (options.drag === true && options.dragArea) {
                _this.addListener(
                    $.extend(
                        options,
                        {
                            zoom: false,
                            type: _this.fileTypeConfig['file'],
                            //这里有点耦合了，通过callback 传代码到 addListener中
                            callback: function (data) {
                                _this.bindmultipleEvent(id, data, options.fileBtn, options.fileSelectBtn, multipleSection, options.onChange);
                            }
                        }
                    )
                );
            }
            //绑定点击事件
            options.uploadBtn && options.uploadBtn.on('click', function () {
                if (_this.multipleNum <= 0 || _this.allFileSize <= 0) {
                    return _this.errorNotice('请选择文件!')
                }
            });

        },
        //多选图片改变触发
        multipleSizeChange: function (fn, data, size, num, add) {
            fn && fn(
                $.extend(
                    data,
                    {
                        allFileSize: add ? this.fileSize += size : this.fileSize -= size,
                        size: size,
                        multipleNum: add ? this.multipleNum += num : this.multipleNum -= 1
                    }
                )
            );
        },
        //移除多图上传的节点
        removeMultipleItem: function (link, callback) {
            var _this = this;
            link.on('click', function () {
                var $this = $(this),
                    id = $(this).data('id'),
                    size = $(this).data('size');
                $('#upload-' + id).remove();
                callback && callback();
            })
        },
        //创建多图上传的节点
        createMultipleItem: function (id, size) {
            size = !!size || 0
            var item = $('<li class="multiple-item" id="upload-' + id + '"><div class="mask"><a href="javascript:;" data-id="' + id + '" data-size="' + size + '">删除</a></div><div class="item-warp hasImg"></div></li>')
            return {
                item: item,
                warp: item.find('.item-warp'),
                mask: item.find('.mask'),
                remove: item.find('a')
            }
        },
        //添加拖拽获取焦点时的样式
        addDragAreaStyle: function (ele, className) {
            ele.addClass(className || 'dragActive');
        },
        //移除拖拽获取焦点时的样式
        removeDragAreaStyle: function (ele, className) {
            ele.removeClass(className || 'dragActive');
        },
        stopAll: function (e) {
            e.preventDefault();
            e.stopPropagation();
            // e.preventDefault && e.preventDefault() || e.originalEvent.preventDefault()
            // e.stopPropagation && e.stopPropagation() || e.originalEvent.stopPropagation()
        },
        /**
         * 绑定拖拽事件 (文件|图片拖拽选择)
         * @param dragArea 拖拽文件相应区域 
         * @param fileArea 文件放置区域 
         * @param fileBtn 文件按钮 
         * @param zoom 缩放  默认 true 
         * @param type 类型  文件还是 图片
         */
        addListener: function (options) {
            var defaults = {
                zoom: true,
                type: this.fileTypeConfig['img'],
                dragAreaActiveClassName: "dragActive"
            };

            var options = $.extend(defaults, options);
            var $dragArea = options.dragArea;
            var dragAreaClassName = options.dragAreaActiveClassName;

            var dragArea = $dragArea.get(0);

            var _this = this;

            document.addEventListener('dragenter', function (e) {
                _this.addDragAreaStyle($dragArea, dragAreaClassName);

            }, false);
            document.addEventListener('dragleave', function () {
                _this.removeDragAreaStyle($dragArea, dragAreaClassName);
            }, false);
            //进入
            dragArea.addEventListener('dragenter', function (e) {
                _this.stopAll(e);
                _this.addDragAreaStyle($dragArea, dragAreaClassName);
            }, false);
            //离开
            dragArea.addEventListener('dragleave', function (e) {
                _this.stopAll(e);
                _this.removeDragAreaStyle($dragArea, dragAreaClassName);
            }, false);
            //移动
            dragArea.addEventListener('dragover', function (e) {
                (e.dataTransfer || e.originalEvent.dataTransfer).dropEffect = 'copy';      //设置文件放置类型为拷
                _this.stopAll(e);
                _this.addDragAreaStyle($dragArea, dragAreaClassName);
            }, false);

            //放下
            dragArea.addEventListener('drop', function (e) {
                _this.stopAll(e);
                _this.removeDragAreaStyle($dragArea, dragAreaClassName);
                var files = (e.dataTransfer || e.originalEvent.dataTransfer).files;
                _this.filterFileInfo(Array.from(files), options.type, options.maxSize, false, function (data) {
                    if (options.type == _this.fileTypeConfig['img']) {
                        options.range && _this.resetScale(options.range, options.fileArea);
                        (function (res) {
                            options.callback && options.callback(res)
                        })(data)
                        options.zoom === true && _this.bindMouseWheel(options.range, options.fileArea);
                    } else {
                        var formData = {};
                        formData[options.fileBtn.attr("name")] = files[0];
                        options.onChange && options.onChange(data);
                        _this.uploadFile(
                            options.fileUploadBtn,
                            undefined,
                            options.url,
                            // { [options.fileBtn.attr("name")]: files[0] },
                            formData,
                            options.progress,
                            options.error,
                            options.success
                        )
                    }

                })
            }, false)
        },
        fileTypeRegExp: function (fileType, reg) {
            var regExp = new RegExp('.*\/(?:' + fileType + ')$', 'i');
            return regExp.test(reg)
        }
    };
    //自执行函数 不暴露成员
    //挂载在 window全局对象 不然访问不到
    win['Upload'] = Upload;
})(window, jQuery);