import { createMachine, interpret } from 'xstate';
import '../style.css';
import elements from '../utils/elements';

const playerMachine = createMachine({
  initial: 'loading',
  states: {
    loading: {
      on: {
        LOADED: { target: 'playing' },
      },
    },
    paused: {
      on: {
        PLAY: { target: 'playing' },
      },
    },
    playing: {
      on: {
        PAUSE: { target: 'paused' },
      },
    },
  },
});

const service = interpret(playerMachine).start();

elements.elPlayButton?.addEventListener('click', () => {
  service.send({ type: 'PLAY' });
});
elements.elPauseButton?.addEventListener('click', () => {
  service.send({ type: 'PAUSE' });
});

service.subscribe((state) => {
  console.log(state);
  elements.elLoadingButton.hidden = !state.matches('loading');
  elements.elPlayButton.hidden = !state.can({ type: 'PLAY' });
  elements.elPauseButton.hidden = !state.can({ type: 'PAUSE' });
});

service.send({ type: 'LOADED' });
