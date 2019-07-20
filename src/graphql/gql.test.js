import gql from 'graphql-tag';
import toQuery from './toQuery';

test.skip('toQuery', () => {
  expect(
    toQuery(
      gql`
        {
          foo: user(id: $userId) {
            id
            name
            isViewerFriend
            profilePicture(size: 50) {
              ...PictureFragment
            }
          }
        }

        fragment PictureFragment on Picture {
          uri
          width
          height
        }
      `,
      { userId: 123 },
      3,
    ),
  ).toEqual([
    // prettier-ignore
    { key: 'user', clock: 3, children: [
      { key: '{"id":123}', alias: 'foo', clock: 3, children: [
        { key: 'id', clock: 3, num: 1 },
        { key: 'name', clock: 3, num: 1 },
        { key: 'isViewerFriend', clock: 3, num: 1 },
        { key: 'profilePicture', clock: 3, children: [
          { key: '{"size":"50"}', clock: 3, children: [
            { key: 'uri', clock: 3, num: 1 },
            { key: 'width', clock: 3, num: 1 },
            { key: 'height', clock: 3, num: 1 },
          ] },
        ] },
      ] },
    ] },
  ]);
});
