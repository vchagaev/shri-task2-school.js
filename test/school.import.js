describe('The school library export to JSON', () => {
    'use strict';
    afterAll(() => {
        deleteDb(this);
    });
    beforeEach((done) => {
        deleteDb(this).then(() => {
            createDb(this, 'export' + Date.now());
            this.db.transaction(() => {
                this.db.getCollection('students').then((result) => {
                    result.add({name: 'vlad1', team: 'winner1', prefList: [1, 2]});
                });
                this.db.getCollection('students').then((result) => {
                    result.add({name: 'vlad2', team: 'winner2', prefList: [1, 2]});
                });
                this.db.getCollection('students').then((result) => {
                    result.add({name: 'vlad3', team: 'winner3', prefList: [2, 1]});
                });
                this.db.getCollection('mentors').then((result) => {
                    result.add({name: 'oleg1', prefList: [1, 2, 3], capacity: 2});
                });
                this.db.getCollection('mentors').then((result) => {
                    result.add({name: 'oleg2', prefList: [3, 2, 1], capacity: 2});
                });
                this.db.getCollection('tasks').then((result) => {
                    result.add({name: 'first', type: 'team'});
                });
                this.db.getCollection('tasks').then((result) => {
                    result.add({name: 'second', type: 'individual'});
                });
            }).then(() => done());
        });
    });

    it('should catch if JSON has invalid structure and current data should not be replaced', (done) => {
        const jsonString = '{' +
            '"mmentors": [{' + // mmentors
            '"name": "oleg1",' +
            '"prefList": [1, 2, 3],' +
            '"capacity": 2,' +
            '"id": 1' +
            '}, {"name": "oleg2", "prefList": [3, 2, 1], "capacity": 2, "id": 2}],' +
            '"students": [{"name": "vlad1", "team": "winner1", "prefList": [1, 2], "id": 1}, {' +
            '"name": "vlad2",' +
            '"team": "winner2",' +
            '"prefList": [1, 2],' +
            '"id": 2' +
            '}, {"name": "vlad3", "team": "winner3", "prefList": [2, 1], "id": 3}],' +
            '"tasks": [{"name": "first", "type": "team", "id": 1}, {' +
            '"name": "second",' +
            '"type": "individual",' +
            '"id": 2' +
            '}]' +
            '}';
        this.db
            .importFromJson(jsonString)
            .catch(() => {
                this.db
                    .dexieObject
                    .mentors
                    .toArray((result) => {
                        expect(result.length).toBe(2);
                        done();
                    })
                    .catch((err) => {
                        fail(err);
                    });
            });
    });

    it('should catch if JSON has invalid name field', (done) => {
        const jsonString = '{' +
            '"mentors": [{' +
            '"sadfsfdsaf": "oleg1",' +
            '"prefList": [1, 2, 3],' +
            '"capacity": 2,' +
            '"id": 1' +
            '}, {"sadfsafsad": "oleg2", "prefList": [3, 2, 1], "capacity": 2, "id": 2}],' +
            '"students": [{"name": "vlad1", "team": "winner", "prefList": [1, 2], "id": 1}, {' +
            '"name": "vlad2",' +
            '"team": "winner",' +
            '"prefList": [1, 2],' +
            '"id": 2' +
            '}, {"sadfsafsda": "vlad3", "team": "winner", "prefList": [2, 1], "id": 3}],' +
            '"tasks": [{"name": "first", "type": "team", "id": 1}, {' +
            '"name": "second",' +
            '"type": "individual",' +
            '"id": 2' +
            '}]' +
            '}';
        this.db
            .importFromJson(jsonString)
            .catch(() => {
                this.db
                    .dexieObject
                    .mentors
                    .toArray((result) => {
                        expect(result.length).toBe(2);
                        done();
                    })
                    .catch((err) => {
                        fail(err);
                    });
            });
    });

    it('should import all data to specific database structure', (done) => {
        const jsonString = '{' +
            '"mentors": [{' +
            '"name": "oleg1",' +
            '"prefList": [1, 2, 3],' +
            '"capacity": 2,' +
            '"id": 1' +
            '}, {"name": "oleg2", "prefList": [3, 2, 1], "capacity": 2, "id": 2}],' +
            '"students": [{"name": "vlad1", "team": "winner", "prefList": [1, 2], "id": 1}, {' +
            '"name": "vlad2",' +
            '"team": "winner",' +
            '"prefList": [1, 2],' +
            '"id": 2' +
            '}, {"name": "vlad3", "team": "winner", "prefList": [2, 1], "id": 3}],' +
            '"tasks": [{"name": "first", "type": "team", "id": 1}, {' +
            '"name": "second",' +
            '"type": "individual",' +
            '"id": 2' +
            '}]' +
            '}';
        this.db
            .importFromJson(jsonString)
            .then(() => {
                this.db
                    .dexieObject
                    .students
                    .where('team')
                    .equals('winner')
                    .toArray((result) => {
                        expect(result.length).toBe(3);
                        done();
                    })
                    .catch((err) => {
                        fail(err);
                    });
            });
    });
});
