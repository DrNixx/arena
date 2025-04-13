import storage from '~/storage'
import { PuzzleOutcome, PuzzleData, UserData } from '../../lichess/interfaces/training'

const db = {
    fetch,
    save,
    clean,
}

export default db

export type Database = typeof db

export interface UserOfflineData {
    user: UserData
    solved: ReadonlyArray<PuzzleOutcome>
    unsolved: ReadonlyArray<PuzzleData>
}

type UserId = string

const dbName = 'offlinePuzzlesV2'

function fetch(userId: UserId): Promise<UserOfflineData | null> {
    return storage.get<UserOfflineData>(`${dbName}.${userId}`)
}

function save(userId: UserId, userData: UserOfflineData): Promise<UserOfflineData> {
    return storage.set(`${dbName}.${userId}`, userData)
        .then(() => userData)
}

function clean(userId: UserId) {
    return storage.remove(`${dbName}.${userId}`)
}
