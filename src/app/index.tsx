import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Button, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

WebBrowser.maybeCompleteAuthSession();

const ISSUER = 'http://localhost:8180/realms/returnit';
const API = 'http://localhost:8080/api/v1';
const CLIENT_ID = 'returnit-app';
const REDIRECT = 'com.returnit.app:/oauth2redirect';

// Kept outside the screen so it survives the screen being rebuilt after login.
let currentOutput = 'Not logged in yet';
const listeners = new Set<(s: string) => void>();
function publish(s: string) {
  currentOutput = s;
  listeners.forEach((l) => l(s));
}

export default function HomeScreen() {
  const discovery = AuthSession.useAutoDiscovery(ISSUER);
  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri: REDIRECT,
      usePKCE: true,
    },
    discovery,
  );
  const [output, setOutput] = useState(currentOutput);

  useEffect(() => {
    listeners.add(setOutput);
    setOutput(currentOutput);
    return () => {
      listeners.delete(setOutput);
    };
  }, []);

  async function login() {
    try {
      if (!discovery || !request) {
        publish('Login server not loaded yet. Try again in a moment.');
        return;
      }
      const result = await promptAsync();
      if (result.type !== 'success') {
        publish('Login result: ' + result.type);
        return;
      }
      const tokens = await AuthSession.exchangeCodeAsync(
        {
          clientId: CLIENT_ID,
          code: result.params.code,
          redirectUri: REDIRECT,
          extraParams: { code_verifier: request.codeVerifier ?? '' },
        },
        discovery,
      );
      const res = await fetch(API + '/account', {
        headers: { Authorization: 'Bearer ' + tokens.accessToken },
      });
      publish('GET /account -> ' + res.status + '\n' + (await res.text()));
    } catch (e) {
      publish('Error: ' + String(e));
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, padding: 24, gap: 16 }}>
        <ThemedText type="title">ReturnIt</ThemedText>
        <Button title="Log in" onPress={login} />
        <ScrollView>
          <ThemedText type="code">{output}</ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}