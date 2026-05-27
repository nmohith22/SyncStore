import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/styles/ThemeContext';
import { themes } from './src/styles/themes';
import { Gamepad, Ghost, Settings, LayoutGrid, Layers, RefreshCcw, Search } from 'lucide-react-native';
import Animated, { 
  FadeInDown,
  Layout
} from 'react-native-reanimated';
import { PlatformCard } from './src/components/PlatformCard';

const { width } = Dimensions.get('window');

interface Game {
  id: string;
  name: string;
  platforms: string[];
  image_url?: string;
  year?: number;
  genre?: string;
}

function MainApp() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('library');
  const [games, setGames] = useState<Game[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchGames = async () => {
    try {
      const res = await fetch('http://localhost:8001/games');
      const data = await res.json();
      
      // Grouping logic: merge games with same name but different platforms
      const groupedMap = new Map<string, Game>();
      
      data.forEach((g: any) => {
        if (groupedMap.has(g.name)) {
          const existing = groupedMap.get(g.name)!;
          if (!existing.platforms.includes(g.platform)) {
            existing.platforms.push(g.platform);
          }
        } else {
          groupedMap.set(g.name, {
            id: String(g.id || Math.random().toString(36).substr(2, 9)),
            name: g.name,
            platforms: [g.platform],
            image_url: g.image_url,
            year: g.year || 2023,
            genre: g.genre || 'Action'
          });
        }
      });

      setGames(Array.from(groupedMap.values()));
    } catch (e) {
      console.error("[SYNC] Error fetching games:", e);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('http://localhost:8001/sync/all', { method: 'POST' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchGames();
    } catch (e) {
      console.error("[SYNC] Sync failed:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  React.useEffect(() => {
    fetchGames();
  }, []);

  const containerStyle = {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: 20,
  };

  const getDynamicFontSize = (text: string) => {
    if (text.length > 20) return 10;
    if (text.length > 12) return 12;
    return 14;
  };

  const filteredGames = games.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={containerStyle}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Gamepad size={32} color={theme.colors.main} />
          <Text style={[styles.logoText, { color: theme.colors.text }]}>
            SYNC<Text style={{ color: theme.colors.main }}>STORE</Text>
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleSync} disabled={isSyncing} style={styles.actionBtn}>
            <RefreshCcw size={22} color={isSyncing ? theme.colors.sub : theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Settings size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.sub + '11', borderColor: theme.colors.sub + '22' }]}>
        <Search size={18} color={theme.colors.sub} style={{ opacity: 0.5 }} />
        <TextInput
          placeholder="SEARCH_REGISTRY"
          placeholderTextColor={theme.colors.sub + '66'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: theme.colors.text }]}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {[
          { id: 'library', icon: LayoutGrid },
          { id: 'platforms', icon: Layers }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[
              styles.tab,
              activeTab === tab.id && { backgroundColor: theme.colors.main }
            ]}
          >
            <tab.icon 
              size={20} 
              color={activeTab === tab.id ? theme.colors.bg : theme.colors.text} 
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.id ? theme.colors.bg : theme.colors.text }
            ]}>
              {tab.id.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View layout={Layout.springify()} style={styles.grid}>
          {activeTab === 'platforms' ? (
            <>
              <PlatformCard 
                name="Steam" 
                loginUrl="https://store.steampowered.com/login/" 
                onLoginSuccess={handleSync} 
              />
              <PlatformCard 
                name="Epic Games" 
                loginUrl="https://www.epicgames.com/id/login" 
                onLoginSuccess={handleSync} 
              />
              <PlatformCard 
                name="PlayStation" 
                loginUrl="https://www.playstation.com/en-us/sign-in/" 
                onLoginSuccess={handleSync} 
              />
              <PlatformCard 
                name="Xbox" 
                loginUrl="https://www.xbox.com/en-US/auth/msa" 
                onLoginSuccess={handleSync} 
              />
            </>
          ) : (
            filteredGames.map((game, i) => (
              <Animated.View
                key={game.id}
                entering={FadeInDown.delay(i * 50).springify()}
                style={[styles.gameCard, { backgroundColor: theme.colors.sub + '22' }]}
              >
                {game.image_url ? (
                  <View style={styles.imagePlaceholder}>
                     <Ghost size={40} color={theme.colors.text} style={{ opacity: 0.1 }} />
                  </View>
                ) : (
                  <Ghost size={40} color={theme.colors.text} style={{ opacity: 0.2 }} />
                )}
                
                <View style={styles.cardContent}>
                  <Text numberOfLines={2} style={[styles.gameTitle, { color: theme.colors.text, fontSize: getDynamicFontSize(game.name) }]}>
                    {game.name}
                  </Text>
                  <View style={styles.platformBadges}>
                    {game.platforms.map(p => (
                      <View key={p} style={[styles.badge, { backgroundColor: theme.colors.main + '44' }]}>
                        <Text style={[styles.badgeText, { color: theme.colors.main }]}>{p.toUpperCase()}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Animated.View>
            ))
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    padding: 8,
    backgroundColor: '#ffffff08',
    borderRadius: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffffff22',
  },
  tabText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    paddingBottom: 40,
  },
  gameCard: {
    width: (width - 55) / 2,
    aspectRatio: 0.8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00000022',
  },
  cardContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  gameTitle: {
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  platformBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '900',
  }
});
