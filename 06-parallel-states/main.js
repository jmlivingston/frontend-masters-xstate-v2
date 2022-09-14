import { assign, createMachine, interpret } from 'xstate';
import '../style.css';

import { raise } from 'xstate/lib/actions';
import elements from '../utils/elements';
import { formatTime } from '../utils/formatTime';

const playerMachine = createMachine({
  context: {
    title: undefined,
    artist: undefined,
    duration: 0,
    elapsed: 0,
    likeStatus: 'unliked', // or 'liked' or 'disliked'
    volume: 5,
  },

  // Refactor this so that there are two parallel regions:
  // 'player' and 'volume'
  // The resulting state value should look like:
  // {
  //   player: 'loading',
  //   volume: 'muted'
  // }
  initial: 'loading',
  states: {
    // These states should be in a parent 'player' region
    loading: {
      id: 'loading',
      tags: ['loading'],
      on: {
        LOADED: {
          actions: 'assignSongData',
          target: 'ready',
        },
      },
    },
    ready: {
      initial: 'playing',
      states: {
        paused: {
          on: {
            PLAY: { target: 'playing' },
          },
        },
        playing: {
          entry: 'playAudio',
          exit: 'pauseAudio',
          on: {
            PAUSE: { target: 'paused' },
          },
          always: {
            cond: (ctx) => ctx.elapsed >= ctx.duration,
            target: '#loading',
          },
        },
      },
    },

    // These states should be in a parent 'volume' region
    unmuted: {
      on: {
        'VOLUME.TOGGLE': 'muted',
      },
    },
    muted: {
      on: {
        'VOLUME.TOGGLE': 'unmuted',
      },
    },
  },
  on: {
    // These should belong to the 'player' region
    SKIP: {
      actions: 'skipSong',
      target: '#loading',
    },
    LIKE: {
      actions: 'likeSong',
    },
    UNLIKE: {
      actions: 'unlikeSong',
    },
    DISLIKE: {
      actions: ['dislikeSong', raise('SKIP')],
    },
    'AUDIO.TIME': {
      actions: 'assignTime',
    },

    // This should belong to the 'volume' region
    VOLUME: {
      cond: 'volumeWithinRange',
      actions: 'assignVolume',
    },
  },
}).withConfig({
  actions: {
    assignSongData: assign({
      title: (_, e) => e.data.title,
      artist: (_, e) => e.data.artist,
      duration: (ctx, e) => e.data.duration,
      elapsed: 0,
      likeStatus: 'unliked',
    }),
    likeSong: assign({
      likeStatus: 'liked',
    }),
    unlikeSong: assign({
      likeStatus: 'unliked',
    }),
    dislikeSong: assign({
      likeStatus: 'disliked',
    }),
    assignVolume: assign({
      volume: (_, e) => e.level,
    }),
    assignTime: assign({
      elapsed: (_, e) => e.currentTime,
    }),
    skipSong: () => {
      console.log('Skipping song');
    },
    playAudio: () => {},
    pauseAudio: () => {},
  },
  guards: {
    volumeWithinRange: (_, e) => {
      return e.level <= 10 && e.level >= 0;
    },
  },
});

const service = interpret(playerMachine).start();
window.service = service;

elements.elPlayButton?.addEventListener('click', () => {
  service.send({ type: 'PLAY' });
});
elements.elPauseButton?.addEventListener('click', () => {
  service.send({ type: 'PAUSE' });
});
elements.elSkipButton?.addEventListener('click', () => {
  service.send({ type: 'SKIP' });
});
elements.elLikeButton?.addEventListener('click', () => {
  service.send({ type: 'LIKE' });
});
elements.elDislikeButton?.addEventListener('click', () => {
  service.send({ type: 'DISLIKE' });
});
elements.elVolumeButton?.addEventListener('click', () => {
  service.send({ type: 'VOLUME.TOGGLE' });
});

service.subscribe((state) => {
  console.log(state.value, state.context);
  const { context } = state;

  elements.elLoadingButton.hidden = !state.hasTag('loading');
  elements.elPlayButton.hidden = !state.can({ type: 'PLAY' });
  elements.elPauseButton.hidden = !state.can({ type: 'PAUSE' });
  elements.elVolumeButton.dataset.level =
    context.volume === 0
      ? 'zero'
      : context.volume <= 2
      ? 'low'
      : context.volume >= 8
      ? 'high'
      : undefined;
  elements.elVolumeButton.dataset.status = state.matches({ volume: 'muted' })
    ? 'muted'
    : undefined;

  elements.elScrubberInput.setAttribute('max', context.duration);
  elements.elScrubberInput.value = context.elapsed;
  elements.elElapsedOutput.innerHTML = formatTime(
    context.elapsed - context.duration
  );

  elements.elLikeButton.dataset.likeStatus = context.likeStatus;
  elements.elArtist.innerHTML = context.artist;
  elements.elTitle.innerHTML = context.title;
});

service.send({
  type: 'LOADED',
  data: {
    title: 'Some song title',
    artist: 'Some song artist',
    duration: 100,
  },
});
