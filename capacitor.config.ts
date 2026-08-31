import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.chess-online.arena',
  appName: 'arena',
  webDir: 'www',
  backgroundColor: '000000ff',
  appendUserAgent: 'Lichobile/8.0.0',
  plugins: {
    PushNotifications: {
      presentationOptions: ['sound', 'alert']
    }
  },
  ios: {
    scheme: 'lichess',
  }
}

export default config

