/**
 * i18n-merge-keysets
 * ==================
 *
 * Собирает `?.keysets.<язык>.js`-файлы на основе `*.i18n`-папок для указанных языков.
 *
 * **Опции**
 *
 * * *String* **target** — Результирующий таргет. По умолчанию — `?.keysets.{lang}.js`.
 * * *String* **lang** — Язык, для которого небходимо собрать файл.
 *
 * **Пример**
 *
 * ```javascript
 * nodeConfig.addTechs([
 *   [ require('enb-bem-i18n/techs/i18n-merge-keysets'), { lang: 'all' } ],
 *   [ require('enb-bem-i18n/techs/i18n-merge-keysets'), { lang: '{lang}' } ]
 * ]);
 * ```
 */
var vow = require('vow'),
    asyncRequire = require('enb/lib/fs/async-require');

module.exports = require('enb/lib/build-flow.js').create()
    .name('i18n-merge-keysets')
    .defineRequiredOption('lang')
    .useDirList('i18n')
    .target('target', '?.keysets.{lang}.js')
    .builder(function (langKeysetDirs) {
        var lang = this._lang,
            langJs = lang + '.js',
            langKeysetFiles = [].concat.apply([], langKeysetDirs.map(function (dir) {
                return dir.files;
            })).filter(function (fileInfo) {
                return fileInfo.name === langJs;
            }),
            result = {};

        return vow.all(langKeysetFiles.map(function (keysetFile) {
            return asyncRequire(keysetFile.fullname).then(function (keysets) {
                if (lang === 'all') { // XXX: Why the hell they break the pattern?
                    keysets = keysets.all || {};
                }
                Object.keys(keysets).forEach(function (keysetName) {
                    var keyset = keysets[keysetName];
                    result[keysetName] = (result[keysetName] || {});
                    if (typeof keyset !== 'string') {
                        Object.keys(keyset).forEach(function (keyName) {
                            result[keysetName][keyName] = keyset[keyName];
                        });
                    } else {
                        result[keysetName] = keyset;
                    }
                });
            });
        })).then(function () {
            return 'module.exports = ' + JSON.stringify(result) + ';';
        });
    })
    .createTech();
