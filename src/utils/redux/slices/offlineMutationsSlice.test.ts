import reducer, {
  enqueueOfflineMutationAction,
  markOfflineMutationFailed,
  retryOfflineMutationsForServer,
  clearOfflineMutationsForServer,
} from './offlineMutationsSlice'
import { OfflineMutation } from '@/utils/offline/offlineMutations'

const song = {
  id: 'song-1',
  title: 'Song',
  artist: 'Artist',
  artistId: 'artist-1',
  cover: { kind: 'none' as const },
  duration: '120',
  albumId: 'album-1',
  streamUrl: 'https://example.com/song.mp3',
}

const mutation: OfflineMutation = {
  id: 'mutation-1',
  serverId: 'server-1',
  type: 'starSong',
  song,
  createdAt: 1,
}

describe('offlineMutationsSlice', () => {
  it('marks failed mutations with retry metadata', () => {
    const queued = reducer(undefined, enqueueOfflineMutationAction(mutation))

    const failed = reducer(queued, markOfflineMutationFailed({
      id: mutation.id,
      error: 'Network request failed',
      failedAt: 100,
      nextRetryAt: 200,
    }))

    expect(failed.queue[0]).toMatchObject({
      retryCount: 1,
      lastError: 'Network request failed',
      lastFailedAt: 100,
      nextRetryAt: 200,
    })
  })

  it('clears failure metadata when retrying a server', () => {
    const failed = {
      queue: [{
        ...mutation,
        retryCount: 2,
        lastError: 'Still offline',
        lastFailedAt: 100,
        nextRetryAt: 200,
      }],
    }

    const retried = reducer(failed, retryOfflineMutationsForServer('server-1'))

    expect(retried.queue[0]).toEqual({
      ...mutation,
      retryCount: 2,
    })
  })

  it('clears queued mutations for a server', () => {
    const otherServerMutation: OfflineMutation = {
      ...mutation,
      id: 'mutation-2',
      serverId: 'server-2',
    }
    const state = { queue: [mutation, otherServerMutation] }

    expect(reducer(state, clearOfflineMutationsForServer('server-1')).queue)
      .toEqual([otherServerMutation])
  })
})
