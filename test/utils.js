/* exported createDb */
const createDb = function (ctx, namespace) {
    'use strict';
    ctx.db = new School(namespace);
    ctx.dbName = namespace;
    ctx.dex = ctx.db.dexieObject;
};
/* exported deleteDb */
const deleteDb = function (ctx) {
    'use strict';
    return new Promise((resolve, reject) => {
        if (ctx && ctx.dbName) {
            ctx.db
                .dexieObject
                .close();
            ctx.db
                .dexieObject
                .delete()
                .finally(resolve)
                .catch((error) => reject(error));
        } else {
            resolve();
        }
    });
};
/* exported bulkAddAndGetCollection */
const bulkAddAndGetCollection = function (ctx, tableName, items) {
    'use strict';
    return new Promise((resolve, reject) => {
        ctx.db
            .getCollection(tableName)
            .then((results) => {
                results
                    .add(items)
                    .then(() => {
                        ctx.db
                            .getCollection(tableName)
                            .then((results) => resolve(results));
                    });
            })
            .catch((error) => reject(error));
    });
};
