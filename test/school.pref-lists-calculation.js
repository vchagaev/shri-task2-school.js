describe('The school library preference lists calculation', () => {
    'use strict';
    afterAll(() => {
        deleteDb(this);
    });

    beforeEach((done) => {
        deleteDb(this).then(() => {
            createDb(this, 'dbCalc' + Date.now());
            done();
        });
    });

    it('should catch when mentors are empty', (done) => {
        bulkAddAndGetCollection(this, 'students',
            [{name: 'student1'}, {name: 'student2'}])
            .then(() => {
                this.db
                    .calcPrefLists()
                    .catch((error) => {
                        expect(error.message).toBe('Students and mentors must be not empty arrays');
                        done();
                    });
            })
            .catch((error) => fail(error.message));
    });

    it('should catch when students are empty', (done) => {
        bulkAddAndGetCollection(this, 'mentors',
            [{name: 'mentor1'}, {name: 'mentor2'}])
            .then(() => {
                this.db
                    .calcPrefLists()
                    .catch((error) => {
                        expect(error.message).toBe('Students and mentors must be not empty arrays');
                        done();
                    });
            })
            .catch((error) => fail(error.message));
    });

    it('should catch if any student does not have pref list', (done) => {
        this.dex.transaction('rw!', this.dex.students, this.dex.mentors, this.dex.tasks, () => {
            this.dex.students.bulkAdd([
                    {name: 'student1'},
                    {name: 'student2', prefList: [1, 2]}
            ]);
            this.dex.mentors.bulkAdd([
                {name: 'mentor1', prefList: [1, 2]},
                {name: 'mentor2', prefList: [1, 2]}
            ]);
        })
        .then(() => {
            this.db
                .calcPrefLists()
                .catch((error) => {
                    expect(error.message).toBe('student1 must have pref list');
                    done();
                });
        })
        .catch((error) => fail(error.message));
    });

    it('should catch if any mentor does not have pref list', (done) => {
        this.dex.transaction('rw!', this.dex.students, this.dex.mentors, this.dex.tasks, () => {
            this.dex.students.bulkAdd([
                {name: 'student1', prefList: [1, 2]},
                {name: 'student2', prefList: [1, 2]}
            ]);
            this.dex.mentors.bulkAdd([
                {name: 'mentor1'},
                {name: 'mentor2', prefList: [1, 2]}
            ]);
        })
            .then(() => {
                this.db
                    .calcPrefLists()
                    .catch((error) => {
                        expect(error.message).toBe('mentor1 must have pref list');
                        done();
                    });
            })
            .catch((error) => fail(error.message));
    });

    it('should catch if any student has pref list with not full list of mentors', (done) => {
        this.dex.transaction('rw!', this.dex.students, this.dex.mentors, this.dex.tasks, () => {
            this.dex.students.bulkAdd([
                {name: 'student1', prefList: [2]},
                {name: 'student2', prefList: [1, 2]}
            ]);
            this.dex.mentors.bulkAdd([
                {name: 'mentor1', prefList: [1, 2]},
                {name: 'mentor2', prefList: [1, 2]}
            ]);
        })
        .then(() => {
            this.db
                .calcPrefLists()
                .catch((error) => {
                    expect(error.message).toBe('student1 has not full pref list');
                    done();
                });
        })
        .catch((error) => fail(error.message));
    });

    it('should catch if any mentor has pref list with not full list of mentors', (done) => {
        this.dex.transaction('rw!', this.dex.students, this.dex.mentors, this.dex.tasks, () => {
            this.dex.students.bulkAdd([
                {name: 'student1', prefList: [2, 1]},
                {name: 'student2', prefList: [1, 2]}
            ]);
            this.dex.mentors.bulkAdd([
                {name: 'mentor1', prefList: [2]},
                {name: 'mentor2', prefList: [1, 2]}
            ]);
        })
        .then(() => {
            this.db
                .calcPrefLists()
                .catch((error) => {
                    expect(error.message).toBe('mentor1 has not full pref list');
                    done();
                });
        })
        .catch((error) => fail(error.message));
    });

    it('should catch if any student has pref list with bad list of mentors', (done) => {
        this.dex.transaction('rw!', this.dex.students, this.dex.mentors, this.dex.tasks, () => {
            this.dex.students.bulkAdd([
                {name: 'student1', prefList: [3, 1]},
                {name: 'student2', prefList: [1, 2]}
            ]);
            this.dex.mentors.bulkAdd([
                {name: 'mentor1', prefList: [1, 2]},
                {name: 'mentor2', prefList: [1, 2]}
            ]);
        })
        .then(() => {
            this.db
                .calcPrefLists()
                .catch((error) => {
                    expect(error.message).toBe('student1 has corrupted pref list');
                    done();
                });
        })
        .catch((error) => fail(error.message));
    });

    it('should catch if any mentor has pref list with bad list of students ', (done) => {
        this.dex.transaction('rw!', this.dex.students, this.dex.mentors, this.dex.tasks, () => {
            this.dex.students.bulkAdd([
                {name: 'student1', prefList: [2, 1]},
                {name: 'student2', prefList: [1, 2]}
            ]);
            this.dex.mentors.bulkAdd([
                {name: 'mentor1', prefList: [3, 2]},
                {name: 'mentor2', prefList: [1, 2]}
            ]);
        })
        .then(() => {
            this.db
                .calcPrefLists()
                .catch((error) => {
                    expect(error.message).toBe('mentor1 has corrupted pref list');
                    done();
                });
        })
        .catch((error) => fail(error.message));
    });

    it('should calculate when mentors\' capacity is less than students number ', (done) => {
        this.dex.transaction('rw!', this.dex.students, this.dex.mentors, this.dex.tasks, () => {
            this.dex.students.bulkAdd([
                {name: 'student1', prefList: [2, 1]},
                {name: 'student2', prefList: [1, 2]},
                {name: 'student3', prefList: [1, 2]},
                {name: 'student4', prefList: [1, 2]},
                {name: 'student5', prefList: [1, 2]}
            ]);
            this.dex.mentors.bulkAdd([
                {name: 'mentor1', capacity: 1, prefList: [1, 2, 3, 4, 5]},
                {name: 'mentor2', capacity: 2, prefList: [1, 2, 3, 4, 5]}
            ]);
        })
        .then(() => {
            this.db
                .calcPrefLists()
                .then((result) => {
                    expect(result[1].id).toBe(1);
                    expect(result[1].prefResults).toEqual(['student2']);
                    expect(result[2].id).toBe(2);
                    expect(result[2].prefResults).toEqual(['student1', 'student3']);
                    done();
                })
                .catch((err) => fail(err));
        })
        .catch((error) => fail(error.message));
    });

    it('should calculate when mentors\' capacity is more than students number ', (done) => {
        this.dex.transaction('rw!', this.dex.students, this.dex.mentors, this.dex.tasks, () => {
            this.dex.students.bulkAdd([
                {name: 'student1', prefList: [2, 1, 3, 4, 5]},
                {name: 'student2', prefList: [1, 2, 3, 4, 5]},
                {name: 'student3', prefList: [1, 2, 3, 4, 5]}
            ]);
            this.dex.mentors.bulkAdd([
                {name: 'mentor1', capacity: 1, prefList: [1, 2, 3]},
                {name: 'mentor2', capacity: 2, prefList: [1, 2, 3]},
                {name: 'mentor2', capacity: 2, prefList: [1, 2, 3]},
                {name: 'mentor2', capacity: 2, prefList: [1, 2, 3]},
                {name: 'mentor2', capacity: 2, prefList: [1, 2, 3]}
            ]);
        })
        .then(() => {
            this.db
                .calcPrefLists()
                .then((result) => {
                    expect(result[1].id).toBe(1);
                    expect(result[1].prefResults).toEqual(['student2']);
                    expect(result[2].id).toBe(2);
                    expect(result[2].prefResults).toEqual(['student1', 'student3']);
                    expect(result[3]).toBeUndefined();
                    expect(result[3]).toBeUndefined();
                    expect(result[4]).toBeUndefined();
                    expect(result[4]).toBeUndefined();
                    expect(result[5]).toBeUndefined();
                    expect(result[5]).toBeUndefined();
                    done();
                })
                .catch((err) => fail(err));
        })
        .catch((error) => fail(error.message));
    });
});
