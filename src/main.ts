import { config } from 'dotenv'
import axios from 'axios'
import archiver from 'archiver';
import { createWriteStream, existsSync, mkdirSync } from 'fs'
import path from 'path';
config({ path: ".env" });

const arch = archiver('zip', { zlib: { level: 1 } });

interface ILinkInfo {
  status: number
  type: string,
  id: string,
}

interface IPlayList {
  status: number;
  result: {
    id: string;
    title: string;
    track_count: number,
    tracks: { id: string, title: string }[]

  }
}

interface IMusicOfPlayList {
  playListName: string;
  musics: IMusic[]
}

interface IMusic {
  id: string,
  title?: string;

}


export function serializeUrl(url: string) {
  let currectLink = ((url.match(/(soundcloud.com\/.*\?|soundcloud.com\/.*$)/g)));
  // if link not match return error

  if (!currectLink) {
    throw new Error('url is invalid');
  }
  return currectLink[0];
}
/*
 * request to link and get information from server
 * */
async function getInformationFromUrl(url: string): Promise<ILinkInfo> {
  try {
    const link = serializeUrl(url)
    // if match request got soundcloud and return result
    const api = `https://one-api.ir/soundcloud/?token=${process.env.TOKEN}&action=getid&link=${link}`;

    const resp = (await axios.get(api)).data;

    if (resp.status !== 200) {
      throw new Error('url is invalid');
    }
    return { status: resp.status, id: resp.result.id, type: resp.result.type } as ILinkInfo
  } catch (err) {
    throw err;
  }
}

/*
 *
get playList information
 *
 * */

async function playListInformation(playListId: string): Promise<IMusicOfPlayList> {
  try {
    let musics: IMusic[] = [];

    const api = `https://one-api.ir/soundcloud/?token=${process.env.TOKEN}&action=playlist&id=${playListId}`;

    const datas = (await axios.get(api)).data as IPlayList;

    if (datas.status !== 200) {
      throw new Error('playlist not found')
    }

    datas.result.tracks.forEach(track => {
      musics.push({ id: track.id, title: track.title })
    })

    return { musics: musics, playListName: datas.result.title } as IMusicOfPlayList;
  } catch (err) {
    throw err;
  }
};

// request for donwload and take stram 
async function download(url: string) {
  try {
    return axios({
      url,
      responseType: 'stream',
      method: 'get'
    })
  } catch (err) {
    throw err;
  }

}

// wait second 
async function timeOut(second: number) {
  setTimeout(() => Promise.resolve(), second * 1000)

}


// faild musics
let failMusics: IMusic[] = [];

// success donwloaded
let successMusicCount = 1;

let blackList: string[] = []
/*
* go and donwload music and store into zip file
* 
*/
async function downloadMusic(musics: IMusic[]) {
  try {
    let songName = "";
    for (const track of musics) {
      try {
        await timeOut(1);
        const url = `https://one-api.ir/soundcloud/?token=${process.env.TOKEN}&action=download&id=${track.id}`
        const response = await download(url);
        // get song name if exsist 
        songName = `${track.title ?? track.id}.mp3`;
        console.log('imjan')
        //append into zip file 
        arch.append(response.data, { name: songName })
        console.log(`${successMusicCount}.- ${songName} added `);
        successMusicCount++;
      } catch (err) {
        console.log('faildam')
        console.error(`${track.id} faild to donwload  `)
        const faild = failMusics.find(m => m.id === track.id)
        console.log('fail in faild Musics', faild)
        if (faild) continue;
        failMusics.push({ id: track.id });
        console.log('push shodam', failMusics)
        await timeOut(1);
        continue;
      }
    }
  } catch (err) {
    throw err;
  }
}



// create archiver pipe line
function createArchPipe(path: string) {
  const writeStram = createWriteStream(path);
  arch.on('close', () => {
    console.log(`done!!\n ${arch.pointer()} bytes are written\n ${successMusicCount} downloaded succesfully`);
  })
  arch.on('error', err => { throw err });
  arch.pipe(writeStram);
}



function createMusicDirectory() {
  const directoryPath = path.join(__dirname, '..', 'music');
  if (!existsSync(directoryPath)) {
    mkdirSync(directoryPath);
  }
  return directoryPath
}
// init project
async function init(url: string) {
  try {
    const urlInfo = await getInformationFromUrl(url);

    if (urlInfo.type != 'playlist') {
      throw new Error('please enter valid playlist url');
    }
    console.log('fetching music')
    const musics = await playListInformation(urlInfo.id);
    console.log(musics)
    if (musics.musics.length < 1) {
      throw new Error('play list is empty');
    }
    const musicDirectory = createMusicDirectory();
    console.log('creating directory')
    const zipPath = musicDirectory + "/" + musics.playListName + '.zip';
    console.log(zipPath)
    createArchPipe(zipPath);
    console.log('pipeing ')
    console.log('processing ....')
    await downloadMusic(musics.musics);
    console.log('please dont close app, might be take a minute :(');
    if (failMusics.length >= 1) {
      console.log('raftam braye download faild ha', failMusics)
      // console.log(failMusics);
      await downloadMusic(failMusics);
    }
    (await arch.finalize());
  } catch (err) {
    console.error((err as Error).message)
    if (successMusicCount >= 1) {
      await arch.finalize();
    }
  }
}

const url = "https://soundcloud.com/mer30boy/sets/overdoz"
init(url);


