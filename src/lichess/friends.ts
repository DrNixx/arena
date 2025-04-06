export interface Friend {
  id: string,
  name: string,
  title?: string
  playing: boolean
  patron: boolean
}

const onlineFriends: Map<string, Friend> = new Map()

export default {
  list(): ReadonlyArray<Friend> {
    return [...onlineFriends.values()].sort((f, f2) => lexicallyCompareFriends(f, f2))
  },
  count(): number {
    return onlineFriends.size
  },
  reset(friends: string[], playings: string[], patrons: string[] ): void {
    onlineFriends.clear()
    friends.forEach(friend => {
      const [id, name, title] = parseFriend(friend)
      const playing = playings.includes(id)
      const patron = patrons.includes(id)
      onlineFriends.set(friend, { id, name, title, playing, patron })
    })
  },
  set(rawName: string, playing: boolean, patron: boolean): void {
    const [id, name, title] = parseFriend(rawName)
    onlineFriends.set(rawName, { id, name, title, playing, patron })
  },
  playing(rawName: string): void {
    const friend = onlineFriends.get(rawName)
    if (friend) {
      onlineFriends.set(rawName, { ...friend, playing: true })
    }
  },
  stoppedPlaying(rawName: string): void {
    const friend = onlineFriends.get(rawName)
    if (friend) {
      onlineFriends.set(rawName, { ...friend, playing: false })
    }
  },
  remove(leaving: string): void {
    onlineFriends.delete(leaving)
  },
  clear(): void {
    onlineFriends.clear()
  },
}

function parseFriend(friend: string): [string, string, string | undefined] {
  const [id, ...rest] = friend.split('/');
  const [name, title] = rest.length > 0 ? rest[0].split(' ') : [friend.split(' ').pop(), undefined];
  return [id, name ?? id, title]
}

function lexicallyCompareFriends(friend1: Friend, friend2: Friend) {
  if (friend1.name.toLowerCase() < friend2.name.toLowerCase())
    return -1
  else if (friend1.name.toLowerCase() > friend2.name.toLowerCase())
    return 1
  else
    return 0
}
