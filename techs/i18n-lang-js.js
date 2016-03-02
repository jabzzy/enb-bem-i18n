/**
 * i18n-lang-js
 * ============
 *
 * Собирает `?.lang.<язык>.js`-файлы на основе `?.keysets.<язык>.js`-файлов.
 *
 * Используется для локализации в JS с помощью BEM.I18N.
 *
 * **Опции**
 *
 * * *String* **target** — Результирующий таргет. По умолчанию — `?.lang.{lang}.js`.
 * * *String* **lang** — Язык, для которого небходимо собрать файл.
 *
 * **Пример**
 *
 * ```javascript
 * nodeConfig.addTechs([
 *   [ require('enb-bem-i18n/techs/i18n-lang-js'), { lang: 'all'} ],
 *   [ require('enb-bem-i18n/techs/i18n-lang-js'), { lang: '{lang}'} ],
 * ]);
 * ```
 */
var path = require('path'),
    tanker = require('../exlib/tanker'),
    enb = require('enb'),
    buildFlow = enb.buildFlow || require('enb/lib/build-flow'),
    asyncRequire = require('enb-async-require'),
    clearRequire = require('clear-require'),

    ALL_LANGUAGES = 'all',
    NEW_LINE = '\n';

module.exports = buildFlow.create()
    .name('i18n-lang-js')
    .target('target', '?.lang.{lang}.js')
    .defineRequiredOption('lang')
    .useSourceFilename('keysetsFile', '?.keysets.{lang}.js')
    .optionAlias('keysetsFile', 'keysetsTarget')
    .builder(function (keysetsFilename) {
        var node = this.node,
            cache = node.getNodeCache(this._target),
            basename = path.basename(keysetsFilename),
            cacheKey = 'keysets-file-' + basename,
            promise;

        if (cache.needRebuildFile(cacheKey, keysetsFilename)) {
            clearRequire(keysetsFilename);
            promise = asyncRequire(keysetsFilename)
                .then(function (keysets) {
                    cache.cacheFileInfo(cacheKey, keysetsFilename);
                    return keysets;
                });
        } else {
            promise = asyncRequire(keysetsFilename);
        }

        return promise.then(function (keysets) {
            var lang = this._lang,
                res = Object.keys(keysets).sort().reduce(function (prev, keysetName) {
                    prev.push(this.__self.getKeysetBuildResult(keysetName, keysets[keysetName], lang));
                    return prev;
                }.bind(this), []);

            return res.length ? this.wrapJs(lang, res.join(NEW_LINE)) : '';
        }, this);
    })
    .methods({
        /**
         * @param {String} lang
         * @param {String} text
         * @returns {String}
         */
        wrapJs: function (lang, text) {
            if (lang === ALL_LANGUAGES) {
                return text;
            }

            return [
                'if (typeof BEM !== \'undefined\' && BEM.I18N) {',
                text,
                'BEM.I18N.lang(\'' + lang + '\');',
                '}'
            ].join(NEW_LINE + NEW_LINE);
        }
    })
    .staticMethods({
        getKeysetBuildResult: function (keysetName, keyset, lang) {
            var res = [];
            if (keysetName === '') {
                res.push(keyset);
            } else {
                res.push('BEM.I18N.decl(\'' + keysetName + '\', {');
                Object.keys(keyset).map(function (key, i, arr) {
                    tanker.xmlToJs(keyset[key], function (js) {
                        res.push('    ' + JSON.stringify(key) + ': ' + js + (i === arr.length - 1 ? '' : ','));
                    });
                });
                res.push('}, {\n"lang": "' + lang + '"\n});');
            }
            return res.join(NEW_LINE);
        }
    })
    .createTech();