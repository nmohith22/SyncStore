import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { LogIn, CheckCircle, AlertCircle, X } from 'lucide-react-native';
import { useTheme } from '../styles/ThemeContext';

interface PlatformCardProps {
  name: string;
  loginUrl: string;
  onLoginSuccess: (cookies: any) => void;
}

export const PlatformCard: React.FC<PlatformCardProps> = ({ name, loginUrl, onLoginSuccess }) => {
  const { theme } = useTheme();
  const [status, setStatus] = useState<'idle' | 'logging_in' | 'connected'>('idle');
  const [showWebView, setShowWebView] = useState(false);

  const handleLogin = () => {
    setShowWebView(true);
    setStatus('logging_in');
  };

  const handleWebViewStateChange = (navState: any) => {
    if (navState.url.includes('account/managed') || navState.url.includes('dashboard') || navState.url.includes('home')) {
        setShowWebView(false);
        setStatus('connected');
        
        // Notify backend of session
        fetch('http://localhost:8001/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: name.toLowerCase(),
            cookies: { session: "captured_mobile_" + Date.now() },
            user_id: "MobileUser_" + Math.floor(Math.random() * 1000)
          })
        }).then(() => {
          onLoginSuccess();
        });
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.sub + '22' }]}>
      <Text style={[styles.name, { color: theme.colors.text }]}>{name}</Text>
      
      {status === 'idle' && (
        <TouchableOpacity 
          onPress={handleLogin}
          style={[styles.btn, { backgroundColor: theme.colors.main }]}
        >
          <LogIn size={16} color={theme.colors.bg} />
          <Text style={[styles.btnText, { color: theme.colors.bg }]}>LOGIN</Text>
        </TouchableOpacity>
      )}

      {status === 'logging_in' && (
        <TouchableOpacity onPress={() => setShowWebView(true)} style={styles.statusRow}>
          <AlertCircle size={16} color={theme.colors.main} />
          <Text style={[styles.statusText, { color: theme.colors.main }]}>AWAITING LOGIN...</Text>
        </TouchableOpacity>
      )}

      {status === 'connected' && (
        <View style={styles.statusRow}>
          <CheckCircle size={16} color="#4ade80" />
          <Text style={[styles.statusText, { color: '#4ade80' }]}>CONNECTED</Text>
        </View>
      )}

      <Modal visible={showWebView} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={styles.modalHeader}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Login to {name}</Text>
            <TouchableOpacity onPress={() => setShowWebView(false)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <WebView 
            source={{ uri: loginUrl }} 
            onNavigationStateChange={handleWebViewStateChange}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

import { SafeAreaView } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
    width: '48%',
    marginBottom: 15,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  btnText: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalHeader: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#111',
  }
});
