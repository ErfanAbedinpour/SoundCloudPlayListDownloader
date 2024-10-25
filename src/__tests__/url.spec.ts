
import { serializeUrl } from '../main';

describe('Url', () => {
  it('must be return soundcloud.com/mer30boy/sets/tehran', () => {
    const result = serializeUrl("https://soundcloud.com/mer30boy/sets/overdoz");
    expect(result).toEqual('soundcloud.com/mer30boy/sets/overdoz')
  })

  it('must be return soundcloud.com/mer30boy/sets/tehran when we send playlist link', () => {

    const result = serializeUrl("https://soundcloud.com/mer30boy/sets/overdoz?si=53abd2b9bd1a4340ac6485862e555476&utm_source=clipboard&utm_medium=text&utm_campaign=social_sharing");
    expect(result).toEqual("soundcloud.com/mer30boy/sets/overdoz?");
  })

});
