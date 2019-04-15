import merge from 'merge-async-iterators';
export default merge;

// const forever = new Promise(() => {});
//
// export default function mergeStreams(...streams) {
//   const promises = [];
//   let consumed = [];
//   let doneCount = 0;
//
//   function addPromise(id) {
//     const stream = streams[id];
//     promises[id] = Promise.resolve(stream.next()).then(value => ({
//       id,
//       value,
//     }));
//   }
//
//   return {
//     next() {
//       if (promises.length !== streams.length) {
//         for (let i = 0; i < streams.length; i++) addPromise(i);
//       }
//       for (const i of consumed) addPromise(i);
//       consumed = [];
//
//       return Promise.race(promises).then(({ id, value }) => {
//         if (!value.done) consumed.push(id);
//
//         if (value.done && ++doneCount < streams.length) {
//           promises[id] = forever; // This will never fulfil.
//           if (typeof value.value === 'undefined') {
//             return this.next();
//           } else {
//             value.done = false;
//           }
//         }
//
//         return value;
//       });
//     },
//
//     return() {
//       for (const stream of streams) stream.return();
//     },
//
//     [Symbol.asyncIterator]() {
//       return this;
//     },
//   };
// }
