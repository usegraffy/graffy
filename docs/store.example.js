import Store from './Store';

const wait = time => new Promise(resolve => setTimeout(resolve, time));

describe('store', () => {
  let store;

  before(() => {
    store = new Store();

    store.onRead('pokes/:id', async function (req, res) {
      const ids = req.params.map(({ id }) => id);
      await wait(50);
      ids.forEach(id => res.send({ `pokes/${id}`: { message: `Hi ${id} 0` }}));
      if (!req.live) return;
      let i = 1;
      while (true) {
        await wait(2000);
        const id = ids[Math.floor(Math.random() * ids.length)];
        res.send({ `pokes/${id}`: { message: `Hi ${id} ${i}` }});
        i++;
      }
    });
  });

  test('get keys', () => {
    const a = await store.get('pokes/a', { message });
    const b = await store.get('pokes/b', { message });
    expect(a).toEqual({ message: 'Hi a 0' });
    expect(b).toEqual({ message: 'Hi b 0' });
  });

  test('watch a key', () => {
    let i = 0;
    for await (const a of store.watch('pokes/a', { message })) {
      expect(a).toEqual({ message: `Hi a ${i}` });
      i++;
      if (i >= 4) break;
    }
  });
});
