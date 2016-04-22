describe('The school library CRUD', () => {
    'use strict';

    afterAll(() => {
        deleteDb(this);
    });

    beforeEach((done) => {
        deleteDb().then(() => {
            createDb(this, 'dbCRUD' + Date.now());
            done();
        });
    });

    it('should add item to collection', (done) => {
        this.db
            .getCollection('students')
            .then((results) => {
                results
                    .add({name: 'student1'})
                    .then((id) => {
                        const dex = this.db.dexieObject;
                        dex.students.get(id).then((stud) => {
                            expect(stud.name).toBe('student1');
                            done();
                        });
                    });
            })
            .catch((error) => fail(error.message));
    });

    it('should add items (array) to collection', (done) => {
        bulkAddAndGetCollection(this, 'students', [{name: 'student1'}, {name: 'student2'}])
            .then(() => {
                const dex = this.db.dexieObject;
                dex.students.toArray((students) => {
                    expect(students.length).toBe(2);
                    expect(students[0].name).toBe('student1');
                    expect(students[1].name).toBe('student2');
                    done();
                });
            })
            .catch((error) => fail(error.message));
    });

    it('should update items of collection without specified ids', (done) => {

        bulkAddAndGetCollection(this, 'students',
            [{name: 'student1'}, {name: 'student2'}])
            .then((result) => {
                result
                    .update({name: 'happy student', id: 'someId'})
                    .then(() => {
                        const dex = this.db.dexieObject;
                        dex.students.toArray((students) => {
                            expect(students.length).toBe(2);
                            expect(students[0].name).toBe('happy student');
                            expect(students[1].name).toBe('happy student');
                            done();
                        });
                    });
            })
            .catch((error) => fail(error.message));
    });

    it('should update items of collection with ids specified', (done) => {
        bulkAddAndGetCollection(this, 'students',
            [{name: 'student1'}, {name: 'student2'}])
            .then((result) => {
                result
                    .update({name: 'happy student'}, [1])
                    .then(() => {
                        const dex = this.db.dexieObject;
                        dex.students
                            .get(1)
                            .then((student) => {
                                expect(student.name).toBe('happy student');
                                done();
                            });
                    });
            })
            .catch((error) => fail(error.message));
    });

    it('should update do nothing with invalid ids', (done) => {
        bulkAddAndGetCollection(this, 'students',
            [{name: 'student1'}, {name: 'student2'}])
            .then((result) => {
                result
                    .update({name: 'happy student'}, [0])
                    .then((success) => {
                        expect(success).toBeUndefined();
                        done();
                    });
            })
            .catch((error) => fail(error.message));
    });

    it('should remove items of collection withoud ids specified', (done) => {
        bulkAddAndGetCollection(this, 'students',
            [{name: 'student1'}, {name: 'student2'}])
            .then((result) => {
                result
                    .remove()
                    .then(() => {
                        const dex = this.db.dexieObject;
                        dex.students.toArray((students) => {
                            expect(students.length).toBe(0);
                            done();
                        });
                    });
            })
            .catch((error) => fail(error.message));
    });

    it('should remove items of collection with ids specified', (done) => {
        bulkAddAndGetCollection(this, 'students',
            [{name: 'student1'}, {name: 'student2'}])
            .then((result) => {
                result
                    .remove([2])
                    .then(() => {
                        const dex = this.db.dexieObject;
                        dex.transaction('r!', dex.students, () => {
                            dex.students
                                .get(2)
                                .then((student) => {
                                    expect(student).toBeUndefined();
                                });
                            dex.students.toArray((students) => {
                                expect(students.length).toBe(1);
                                expect(students[0].name).toBe('student1');
                            });
                        }).then(() => done());
                    });
            })
            .catch((error) => fail(error.message));
    });

    it('should maintain database on students deleting', (done) => {
        const dex = this.db.dexieObject;
        dex.transaction('rw!', dex.students, dex.tasks, dex.mentors, () => {
            const studIds = [];
            dex.students
                .add({name: 'student1', prefList: [1, 2]})
                .then((id) => studIds.push(id));
            dex.students
                .add({name: 'student2', prefList: [2, 1]})
                .then((id) => studIds.push(id));
            dex.students
                .add({name: 'student3'})
                .then((id) => studIds.push(id));

            dex.mentors.bulkAdd([
                {name: 'mentor1', prefList: [1, 2, 3], prefResults: ['student1']},
                {name: 'mentor2', prefList: [1, 3], prefResults: ['student2']}
            ]);
        }).finally(() => {
            this.db
                .getCollectionWhere('students', 'name', 'student2')
                .then((result) => {
                    result
                        .remove()
                        .then(() => {
                            dex.mentors.toArray((result) => {
                                expect(result[0].prefList).toEqual([1, 3]);
                                expect(result[0].prefResults).toEqual([]);
                                expect(result[1].prefList).toEqual([1, 3]);
                                expect(result[1].prefResults).toEqual([]);
                                done();
                            });
                        });
                });
        });
    });

    it('should maintain database on mentors deleting', (done) => {
        const dex = this.db.dexieObject;
        dex.transaction('rw!', dex.students, dex.tasks, dex.mentors, () => {
            const studIds = [];
            dex.students
                .add({name: 'student1', prefList: [1, 2]})
                .then((id) => studIds.push(id));
            dex.students
                .add({name: 'student2', prefList: [2, 1]})
                .then((id) => studIds.push(id));
            dex.students
                .add({name: 'student3'})
                .then((id) => studIds.push(id));

            dex.mentors.bulkAdd([
                {name: 'mentor1', prefList: [1, 2, 3], prefResults: ['student1']},
                {name: 'mentor2', prefList: [2, 1, 3], prefResults: ['student2']}
            ]);
        }).finally(() => {
            this.db
                .getCollectionWhere('mentors', 'name', 'mentor1')
                .then((result) => {
                    result
                        .remove()
                        .then(() => {
                            dex.mentors.toArray((result) => {
                                expect(result[0].prefList).toEqual([2, 1, 3]);
                                expect(result[0].prefResults).toEqual([]);
                                dex.students.toArray((result) => {
                                    expect(result[0].prefList).toEqual([2]);
                                    expect(result[1].prefList).toEqual([2]);
                                    expect(result[2].prefList).toBeUndefined();
                                    done();
                                });

                            });
                        });
                });
        });
    });

    it('should maintain database on tasks deleting', (done) => {
        const dex = this.db.dexieObject;
        dex.transaction('rw!', dex.students, dex.tasks, dex.mentors, () => {
            const studIds = [];
            dex.students
                .add({name: 'student1', 1: 5, 2: 4})
                .then((id) => studIds.push(id));
            dex.students
                .add({name: 'student2', 1: 4, 2: 5})
                .then((id) => studIds.push(id));
            dex.students
                .add({name: 'student3'})
                .then((id) => studIds.push(id));

            dex.tasks.bulkAdd([
                {name: 'test1', type: 'individual'},
                {name: 'task2', type: 'team'}
            ]);
        }).finally(() => {
            this.db
                .getCollectionWhere('tasks', 'name', 'task2')
                .then((result) => {
                    result
                        .remove()
                        .then(() => {
                            dex.students.toArray((result) => {
                                expect(result[0][2]).toBeUndefined();
                                expect(result[0][1]).toBe(5);
                                expect(result[1][2]).toBeUndefined();
                                expect(result[1][1]).toBe(4);
                                expect(result[2][2]).toBeUndefined();
                                expect(result[2][1]).toBeUndefined();
                                done();
                            });
                        });
                });
        });
    });

    it('should wait for all operations in transaaction', (done) => {
        let i = 0;
        this.db.transaction(() => {
            this.db.getCollection('students').then(() => {
                i += 1;
            });
            this.db.getCollection('mentors').then(() => {
                i += 1;
            });
            this.db.getCollection('tasks').then(() => {
                i += 1;
            });
        }).then(() => {
            expect(i).toBe(3);
            done();
        });
    });
});
