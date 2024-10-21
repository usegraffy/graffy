"use strict";
/**
 * This file is for testing typescript checks in an editor.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var testStore = {};
var t = 'Activity';
var q = { name: true, id: true };
testStore.read(t, { $key: 'arst', name: true });
var res = await testStore.read(['Activity', '123'], q);
res.id;
testStore.read({ Activity: { name: true } });
