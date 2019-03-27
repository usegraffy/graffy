import Graffy from './Graffy';

describe('put', () => {
  let g;

  beforeEach(() => {
    g = new Graffy();
  });

  test('should call the put handler with args', () => {
    const handler = jest.fn();
    g.onPut(handler);
    g.put({ foo: 42 }, { source: 'a' });
    expect(handler).toBeCalledWith({ foo: 42 }, { source: 'a' });
  });
});
