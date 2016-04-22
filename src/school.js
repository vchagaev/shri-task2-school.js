/**
 * @typedef {Object} Student
 * @property name {string} - student's name
 * @property team {string} - student's team
 * @property prefList {Array<Number>} - Student's preferences list (descending. 0 index for the most desired mentor)
 * @property %TaskId% {Number} - Student's mark for the task with id.
 */

/**
 * @typedef {Object} Mentor
 * @property name {string} - mentor's name
 * @property capacity {Number} - How many students the mentor are ready to take
 * @property prefList {Array<Number>} - Mentor's preferences list (descending. 0 index for the most desired student)
 * @property prefResults {Array<String>} - The list of students building
 * based on preferences lists all students and all mentors
 */

/**
 * @typedef {Object} PrefResult
 * @property id {Number} - Mentor's ID
 * @property students {Array<String>} - The list of students
 */

/**
 * @typedef {Object} Team
 * @property name {string} - name of the team
 * @property students {Array<Student>} - Array of students in the group
 */

/**
 * @typedef {Object} ResultCollection
 * @property {SchoolArray} - SchoolArray for Students, Tasks and Mentors
 * @property {Array<Team>} - TeamsArray for Teams
 * @property {Error} - for unknown collection names
 */

/**
 * Class is a service class that provides a simple interface to work with CRUD events
 * @extends Array
 */
class SchoolArray extends Array {
    /**
     * Constructor for the service class SchoolArray
     * @example
     * var shri = new SchoolArray(dexieDb, dexieTable, initialArray);
     * @param {Dexie} dexieDb - instance Dexie.js
     * @param {string} dexieTable - Dexie.js table name
     * @param {Array<Student|Mentor|Task>} initialArray - items to be initialized
     */
    constructor(dexieDb, dexieTable, initialArray) {
        super(...initialArray);
        this.db = dexieDb;
        this.table = dexieTable;
    }

    /**
     * Gets ids of current array
     * @returns {Array<Number>} Ids of the current array
     */
    getIds() {
        return this.map((obj) => obj.id);
    }

    /**
     * Adds item/items to current collection
     * @param {Array<Object>|Object} obj - Object(s) to add
     * @returns {Promise<Number|Error>} id of the last added item
     */
    add(obj) {
        const isArr = obj instanceof Array;

        return new Promise((resolve, reject) => {
            if (isArr) {
                this.table
                    .bulkAdd(obj)
                    .then((id) => resolve(id))
                    .catch((error) => reject(error));
            } else {
                this.table
                    .add(obj)
                    .then((id) => resolve(id))
                    .catch((error) => reject(error));
            }
        });
    }

    /**
     * Updates items in the collection by ids or by current array ids
     * @param {Object} changes - New data
     * @param {Array<Number>} [ids] - Ids for updating in the collection
     * @returns {Promise<undefined|Error>}
     */
    update(changes, ids) {
        const db = this.db;
        const table = this.table;

        if (changes.id) {
            delete changes.id;
        }
        const idsToUpdate = ids || this.getIds();

        return new Promise((resolve, reject) => {
            db
                .transaction('rw!', table, () => {
                    idsToUpdate.forEach((id) => table.update(id, changes));
                })
                .then(() => resolve())
                .catch((err) => reject(err));
        });
    }

    /**
     * Removes items from the collection by ids or by current array ids and maintains the database
     * @param {Array<Number>} [ids] - Ids for removing in the collection
     * @returns {Promise}
     */
    remove(ids) {
        const db = this.db;
        const table = this.table;

        function deleteIdsFromPref(prefList, ids) {
            ids.forEach((id) => {
                if (prefList) {
                    const index = prefList.indexOf(id);
                    if (index !== -1) {
                        prefList.splice(index, 1);
                    }
                }
            });
        }

        const idsToDelete = ids || this.getIds();

        return new Promise((resolve, reject) => {
            db.transaction('rw!', db.students, db.mentors, db.tasks, () => {
                table.bulkDelete(idsToDelete);

                switch (table.name) {
                    case 'students':
                        db.mentors.toArray((mentors) => {
                            mentors.forEach((mentor) => {
                                deleteIdsFromPref(mentor.prefList, idsToDelete);
                                mentor.prefResults = [];
                                db.mentors.put(mentor);
                            });
                        });
                        break;
                    case 'tasks':
                        db.students.toArray((students) => {
                            students.forEach((student) => {
                                idsToDelete.forEach((id) => {
                                    if (student[id]) {
                                        delete student[id];
                                        db.students.put(student);
                                    }
                                });
                            });
                        });
                        break;
                    case 'mentors':
                        db.students.toArray((students) => {
                            students.forEach((student) => {
                                deleteIdsFromPref(student.prefList, idsToDelete);
                                db.students.put(student);
                            });
                        });
                        db.mentors.toArray((mentors) => {
                            mentors.forEach((mentor) => {
                                mentor.prefResults = [];
                                db.mentors.put(mentor);
                            });
                        });
                        break;
                }
            })
            .then(() => resolve(idsToDelete))
            .catch((error) => reject(error));
        });
    }

}
/* exported School */

/**
 * School is a library that provides a simple interface to work with processes of SHRI.<br>
 * School is the main class and the default export of the library.<br>
 * An instance of this class represents an interface to work with IndexedDB. Using Dexie.js wrapper.
 */
class School {
    /**
     * Create a school instance
     * @example
     * var shri = new School('shri-2016');
     * @param {string} dbName - name for IndexedDB instance where all data will be stored
     */
    constructor(dbName) {
        this.dbName = dbName;
        this.STUDETNTS_SCHEMA = '++id,name,team,*prefList';
        this.MENTORS_SCHEMA = '++id,name,capacity,*prefList,*prefResults';
        this.TASKS_SCHEMA = '++id,name,type';
        this.db = new Dexie(dbName);
        this.db.version(1).stores({
            students: this.STUDETNTS_SCHEMA,
            mentors: this.MENTORS_SCHEMA,
            tasks: this.TASKS_SCHEMA
        });
        this.db.open();
    }

    /**
     * Gets all elements of collection by name to work with it
     * @param {string} collectionName - name of the colletion (Students, Mentors, Tasks, Teams)
     * @returns {Promise<ResultCollection>} Promise with the results array
     */
    getCollection(collectionName) {
        const db = this.db;

        function resolveGet(table) {
            return new Promise((resolve, reject) => {
                table
                    .toArray((arr) => resolve(new SchoolArray(db, table, arr)))
                    .catch((error) => reject(error));
            });
        }

        switch (collectionName) {
            case 'teams':
                return new Promise((resolve, reject) => {
                    db.students
                        .orderBy('team')
                        .uniqueKeys()
                        .then((teams) => {
                            const resultArr = [];
                            db.transaction('r', db.students, () => {
                                teams.forEach((team) => {
                                    db.students
                                        .where('team')
                                        .equals(team)
                                        .toArray((studs) => {
                                            resultArr.push({
                                                name: team,
                                                students: studs
                                            });
                                        });
                                });
                            }).then(() => resolve(resultArr));
                        })
                        .catch((error) => reject(error));
                });
            default:
                return resolveGet(db[collectionName]);
        }
    }

    /**
     * Gets collection with 'where' clause
     * @param {String} collectionName - name of the colletion (Students, Mentors, Tasks, Teams)
     * @param {String} field - Field name
     * @param {String|Number|Array} value - value to filter by
     * @returns {Promise<ResultCollection>} Promise with the results array
     */
    getCollectionWhere(collectionName, field, value) {
        const db = this.db;
        const table = db[collectionName];

        return new Promise((resolve, reject) => {
            table
                .where(field)
                .equals(value)
                .toArray((items) => resolve(new SchoolArray(db, table, items)))
                .catch((error) => reject(error));
        });
    }

    /**
     * Start a database transaction. Will wait until all operations are executed
     * @param {function} funcToExecute - which function will be executed
     * @returns {Promise<undefined|Error>} - when everything has done
     */
    transaction(funcToExecute) {
        const db = this.db;
        return new Promise((resolve, reject) => {
            db.transaction('rw!', db.students, db.mentors, db.tasks, () => funcToExecute())
                .then(() => resolve())
                .catch((error) => reject(error));
        });
    }

    /**
     * Finds for students the most appropriate mentors according preference lists. All students' and mentors' preference
     * lists must be valid (Each student ranks each mentors and vice versa)
     * Using Donald Knuth's basic algorithm about stable marriages
     * @returns {Promise<Array<PrefResult>>} array of pref results
     */
    calcPrefLists() {
        const db = this.db;

        /**
         * Checks that preferences lists are valid
         * @returns {Promise} Return students,
         * mentors, students' ids and mentors' ids
         */
        function check() {

            /**
             * Validates each preference list
             * @param {Array<Student|Mentor>} array - Students' or mentors' array
             * @param {Number} oppositeLength - how many records each prefList should contain
             * @param {Array<Number>} oppositeIds - which ids each prefList should contain
             * @param {function} reject - reject for promise
             */
            function checkPrefLists(array, oppositeLength, oppositeIds, reject) {
                array.forEach((cur) => {
                    if (!cur.prefList) {
                        reject(new Error(cur.name + ' must have pref list'));
                    }
                    if (cur.prefList.length !== oppositeLength) {
                        reject(new Error(cur.name + ' has not full pref list'));
                    }
                    cur.prefList.forEach((id) => {
                        if (oppositeIds.indexOf(id) === -1) {
                            reject(new Error(cur.name + ' has corrupted pref list'));
                        }
                    });
                });
            }

            return new Promise((resolve, reject) => {
                db.mentors
                    .toArray((mentors) => {
                        db.students
                            .toArray((students) => {
                                const sLen = students.length;
                                const mLen = mentors.length;
                                const mIds = mentors.map((mentor) => mentor.id);
                                const sIds = students.map((student) => student.id);
                                if (sLen === 0 || mLen === 0) {
                                    reject(new Error('Students and mentors must be not empty arrays'));
                                }
                                checkPrefLists(students, mLen, mIds, reject);
                                checkPrefLists(mentors, sLen, sIds, reject);
                                resolve([students, mentors, sIds, mIds]);
                            })
                            .catch((error) => reject(error));
                    });
            });
        }

        /**
         * Adds fake mentors or students. Depending on the number of students and mentors capacity
         * @param {Array}params - students,
         * mentors and their ids
         * @returns {Array} Students and mentors with fakes and mentors ids
         */
        function equalize(params) {
            const students = params[0];
            const mentors = params[1];
            const sIds = params[2];
            const mIds = params[3];
            let i;
            const mFake = [];
            const sFake = students;
            const onlyBad = [];

            const BadSomeone = class {
                /*
                 * Creates fake mentor or student
                 * {Number} fakeId - positive number of fake
                 * Array<Number>} oppositeIds - which Ids fake should have
                 */
                constructor(fakeId, oppositeIds) {
                    this.id = -1 * fakeId;
                    this.prefList = oppositeIds;
                }
            };
            /**
             * Adds fakes
             * @param {Array<Student|Mentor>} from - who have more
             * @param {Array<Student|Mentor>} to - who has less
             * @param {Array<Number>} toIds - ids who have less
             * @param {Number} diff - the difference between mentors and students (positive)
             */
            function addBadPeople(from, to, toIds, diff) {
                let tempBad;
                for (let i = 0; i < diff; i++) {
                    tempBad = new BadSomeone(i + 1, toIds);
                    to.push(tempBad);
                    onlyBad.push(tempBad.id);
                }
                from.forEach((one) => {
                    one.prefList = one.prefList.concat(onlyBad);
                });
            }
            // Add mentors fakes according their capacity
            mentors.forEach((mentor) => {
                for (i = 0; i < mentor.capacity; i++) {
                    mFake.push({
                        id: mentor.id,
                        prefList: mentor.prefList
                    });
                }
            });
            let diff = students.length - mFake.length;
            if (diff > 0) {
                addBadPeople(sFake, mFake, sIds, diff);
            } else {
                diff = diff * -1;
                addBadPeople(mFake, sFake, mIds, diff);
            }
            return [sFake, mFake, mIds];
        }

        /**
         * Apply the basic algorithm and distribute students mentors
         * Using Donald Knuth's basic algorithm about stable marriages
         * @param {Array} params - Students and mentors
         * with fakes and mentors ids
         * @returns {Array<PrefResult>} final result
         */
        function calculate(params) {

            const students = params[0];
            const n = students.length;
            const mentors = params[1];
            const mIds = params[2];

            const reallyBadMan = {
                id: 0,
                prefList: mIds
            };
            students.push(reallyBadMan);
            // initially all students are linked with really bad (fake) mentor
            mentors.forEach((mentor) => {
                mentor.curStud = reallyBadMan;
                mentor.prefList.push(reallyBadMan.id);
            });
            let happyPairs = 0;
            while (happyPairs < n) {
                let curStudent = students[happyPairs];
                while (curStudent.id !== reallyBadMan.id) {
                    const desiredMentor = curStudent.prefList[0];
                    mentors.forEach((mentor) => {
                        if (mentor.id === desiredMentor &&
                            mentor.prefList.indexOf(curStudent.id) < mentor.prefList.indexOf(mentor.curStud.id)) {
                            const temp = mentor.curStud;
                            mentor.curStud = curStudent;
                            curStudent = temp;
                        }
                    });
                    if (curStudent.id !== reallyBadMan.id) {
                        curStudent.prefList.splice(curStudent.prefList.indexOf(desiredMentor), 1);
                    }
                }
                happyPairs += 1;
            }
            const results = [];
            mentors.forEach((mentor) => {
                // avoid fakes
                if (mentor.id > 0 && mentor.curStud.name) {
                    if (results[mentor.id]) {
                        results[mentor.id].prefResults.push(mentor.curStud.name);
                    } else {
                        results[mentor.id] = {id: mentor.id, prefResults: [mentor.curStud.name]};
                    }
                }
            });
            return results;
        }

        /**
         *
         * @param {Array<PrefResult>} results - results to write to db
         * @returns {Promise<Array<PrefResult>|Error>} results of calculation
         */
        function writeResults(results) {
            return new Promise((resolve, reject) => {

                db.transaction('rw!', db.mentors, () => {
                    results.forEach((result) => {
                        db.mentors.update(result.id, {prefResults: result.prefResults});
                    });
                })
                .then(() => resolve(results))
                .catch((error) => reject(error));
            });
        }

        return new Promise((resolve, reject) => {
            check()
                .then(equalize)
                .then(calculate)
                .then(writeResults)
                .then((results) => resolve(results))
                .catch((error) => reject(error));
        });
    }

    /**
     * Exports school's data (database) to JSON string
     * @returns {Promise<String|Error>} - String with JSON or error
     */
    exportToJson() {
        const db = this.db;
        return new Promise((resolve, reject) => {
            let mens = [];
            let studs = [];
            let tsks = [];
            db.transaction('r', db.students, db.mentors, db.tasks, () => {
                db.mentors.toArray((mentors) => {
                    mens = mentors;
                });
                db.students.toArray((students) => {
                    studs = students;
                });
                db.tasks.toArray((tasks) => {
                    tsks = tasks;
                });
            })
            .then(() => {
                const resultObj = {
                    mentors: mens,
                    students: studs,
                    tasks: tsks
                };
                resolve(JSON.stringify(resultObj));
            })
            .catch((error) => reject(error));
        });
    }

    /**
     * Validates json and replaces current data with data from JSON
     * @param {String} json - string with imported JSON
     * @returns {Promise<undefined|Error>} - Error if validation or import failed
     */
    importFromJson(json) {
        /**
         * Validates importedDB json
         * @param importedDb {object} - imported db
         * @param reject - reject from promise
         * @returns {boolean} - true if validation is passed
         */
        function validation(importedDb, reject) {
            function invalidName() {
                throw (new Error('name must be string'));
            }
            try {
                importedDb.students.forEach((stud) => {
                    if (!stud.hasOwnProperty('name')) {
                        invalidName();
                    }
                });
                importedDb.mentors.forEach((mentor) => {
                    if (!mentor.hasOwnProperty('name')) {
                        invalidName();
                    }
                });
                importedDb.tasks.forEach((task) => {
                    if (!task.hasOwnProperty('name')) {
                        invalidName();
                    }
                });
                return true;
            } catch (error) {
                reject(error.message);
                return false;
            }
        }

        let db = this.db;
        const _this = this;
        return new Promise((resolve, reject) => {
            const importedDB = JSON.parse(json);
            if (validation(importedDB, reject)) {
                db
                    .delete()
                    .catch(() => reject(new Error('Could not delete database ' + db.name)))
                    .finally(() => {
                        _this.db = new Dexie(_this.dbName);
                        _this.db.version(1).stores({
                            students: _this.STUDETNTS_SCHEMA,
                            mentors: _this.MENTORS_SCHEMA,
                            tasks: _this.TASKS_SCHEMA
                        });
                        _this.db.open();
                        db = _this.db;
                        db
                            .transaction('rw!', db.students, db.mentors, db.tasks, () => {
                                db.students.bulkAdd(importedDB.students);
                                db.mentors.bulkAdd(importedDB.mentors);
                                db.tasks.bulkAdd(importedDB.tasks);
                            })
                        .then(() => resolve())
                            .catch((error) => reject(error));
                    });
            }
        });
    }

    /**
     * Gets Dexie.js object (For testing purpose only)
     * @returns {Dexie}
     */
    get dexieObject() {
        return this.db;
    }
}
