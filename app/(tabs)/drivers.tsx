import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Platform, Modal, Alert, Image, TextInput, Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import CallModal from '@/components/messenger/CallModal';

// ── Types ────────────────────────────────────────────────────────────────────

type TabType = 'my_requests' | 'schedule' | 'new_request' | 'history' | 'recurring';

interface Coords {
  lat: number;
  lng: number;
}

interface NavigatorOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  available: boolean;
  openUrl: (coords: Coords, label?: string) => string;
}

// ── Navigator helpers ────────────────────────────────────────────────────────

function getNavigatorOptions(destination: Coords, label?: string): NavigatorOption[] {
  const encodedLabel = encodeURIComponent(label || 'Destination');
  return [
    {
      id: 'google_maps',
      name: 'Google Maps',
      icon: 'navigate-outline',
      color: '#4285F4',
      available: true,
      openUrl: (c) =>
        Platform.OS === 'ios'
          ? `comgooglemaps://?daddr=${c.lat},${c.lng}&directionsmode=driving`
          : `google.navigation:q=${c.lat},${c.lng}`,
    },
    {
      id: 'yandex_navi',
      name: 'Yandex Navigator',
      icon: 'compass-outline',
      color: '#FC3F1D',
      available: true,
      openUrl: (c) => `yandexnavi://build_route_on_map?lat_to=${c.lat}&lon_to=${c.lng}`,
    },
    {
      id: 'yandex_maps',
      name: 'Yandex Maps',
      icon: 'map-outline',
      color: '#FC3F1D',
      available: true,
      openUrl: (c) => `yandexmaps://maps.yandex.ru/?rtext=~${c.lat},${c.lng}&rtt=auto`,
    },
    {
      id: 'waze',
      name: 'Waze',
      icon: 'car-outline',
      color: '#33CCFF',
      available: true,
      openUrl: (c) => `waze://?ll=${c.lat},${c.lng}&navigate=yes`,
    },
    {
      id: 'apple_maps',
      name: 'Apple Maps',
      icon: 'location-outline',
      color: '#007AFF',
      available: Platform.OS === 'ios',
      openUrl: (c) => `maps://app?daddr=${c.lat},${c.lng}&dirflg=d`,
    },
    {
      id: '2gis',
      name: '2GIS',
      icon: 'business-outline',
      color: '#1DAD4E',
      available: true,
      openUrl: (c) => `dgis://2gis.ru/routeSearch/rsType/car/to/${c.lng},${c.lat}`,
    },
  ];
}

async function openNavigator(nav: NavigatorOption, coords: Coords, label?: string) {
  const url = nav.openUrl(coords, label);
  const canOpen = await Linking.canOpenURL(url);

  if (canOpen) {
    await Linking.openURL(url);
  } else {
    // Fallback to web version
    const webUrls: Record<string, string> = {
      google_maps: `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`,
      yandex_navi: `https://yandex.ru/maps/?rtext=~${coords.lat},${coords.lng}&rtt=auto`,
      yandex_maps: `https://yandex.ru/maps/?rtext=~${coords.lat},${coords.lng}&rtt=auto`,
      waze: `https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`,
      apple_maps: `https://maps.apple.com/?daddr=${coords.lat},${coords.lng}&dirflg=d`,
      '2gis': `https://2gis.ru/routeSearch/rsType/car/to/${coords.lng},${coords.lat}`,
    };
    const webUrl = webUrls[nav.id];
    if (webUrl) {
      await Linking.openURL(webUrl);
    } else {
      Alert.alert('Not available', `${nav.name} is not installed on your device.`);
    }
  }
}

// ── Place Autocomplete ───────────────────────────────────────────────────────

interface PlaceSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

function formatPlaceName(s: PlaceSuggestion): string {
  const addr = s.address;
  if (!addr) return s.display_name;
  const parts: string[] = [];
  if (addr.road || addr.pedestrian || addr.street) {
    let road = addr.road || addr.pedestrian || addr.street || '';
    if (addr.house_number) road = `${road} ${addr.house_number}`;
    parts.push(road);
  }
  if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village || '');
  if (addr.country) parts.push(addr.country);
  if (parts.length === 0) return s.display_name;
  const name = addr.aeroway || addr.amenity || addr.tourism || addr.building || addr.shop;
  return name ? `${name}, ${parts.join(', ')}` : parts.join(', ');
}

function PlaceAutocomplete({
  value,
  onChangeText,
  onSelect,
  placeholder,
  colors,
  dotColor,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (place: { address: string; lat: number; lng: number }) => void;
  placeholder: string;
  colors: any;
  dotColor: string;
}) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=en,ru`,
        { signal: abortRef.current.signal, headers: { 'User-Agent': 'OfficeApp/1.0' } }
      );
      const data: PlaceSuggestion[] = await res.json();
      setSuggestions(data);
      setShowDropdown(data.length > 0);
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleChange = (text: string) => {
    onChangeText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 400);
  };

  const handleSelect = (s: PlaceSuggestion) => {
    const name = formatPlaceName(s);
    onChangeText(name);
    onSelect({ address: name, lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    setSuggestions([]);
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return (
    <View style={{ zIndex: 10 }}>
      <View style={[styles.autocompleteInput, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={[styles.autocompleteDot, { backgroundColor: dotColor }]} />
        <TextInput
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          style={[styles.autocompleteTextInput, { color: colors.textPrimary, paddingRight: value.length > 0 || isSearching ? 32 : 4 }]}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
        />
        {(isSearching || value.length > 0) && (
          <View style={[styles.autocompleteActionWrap, { backgroundColor: colors.bgCard }]}>
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <TouchableOpacity
                onPress={() => { onChangeText(''); setSuggestions([]); setShowDropdown(false); }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.autocompleteClearBtn}
              >
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      {showDropdown && suggestions.length > 0 && (
        <View style={[styles.suggestionsDropdown, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={`${s.lat}-${s.lon}-${i}`}
              style={[styles.suggestionItem, i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={() => handleSelect(s)}
              activeOpacity={0.6}
            >
              <Ionicons name="location-outline" size={16} color={dotColor} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.suggestionMain, { color: colors.textPrimary }]} numberOfLines={1}>
                  {formatPlaceName(s)}
                </Text>
                {s.display_name !== formatPlaceName(s) && (
                  <Text style={[styles.suggestionSub, { color: colors.textMuted }]} numberOfLines={1}>
                    {s.display_name}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, colors }: { status: string; colors: any }) {
  const config: Record<string, { color: string; label: string; icon: string }> = {
    pending:     { color: '#f59e0b', label: 'Pending',     icon: 'time-outline' },
    approved:    { color: '#10b981', label: 'Approved',    icon: 'checkmark-circle-outline' },
    declined:    { color: '#ef4444', label: 'Declined',    icon: 'close-circle-outline' },
    cancelled:   { color: '#6b7280', label: 'Cancelled',   icon: 'ban-outline' },
    scheduled:   { color: '#3b82f6', label: 'Scheduled',   icon: 'calendar-outline' },
    in_progress: { color: '#8b5cf6', label: 'In Progress', icon: 'navigate-outline' },
    completed:   { color: '#10b981', label: 'Completed',   icon: 'checkmark-done-outline' },
  };
  const c = config[status] ?? { color: colors.textMuted, label: status, icon: 'ellipse-outline' };
  return (
    <View style={[styles.statusBadge, { backgroundColor: c.color + '18' }]}>
      <Ionicons name={c.icon as any} size={12} color={c.color} />
      <Text style={[styles.statusBadgeText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

// ── Static map preview ───────────────────────────────────────────────────────

function MapPreview({
  pickupCoords,
  dropoffCoords,
  colors,
  onPress,
}: {
  pickupCoords?: Coords;
  dropoffCoords?: Coords;
  colors: any;
  onPress: () => void;
}) {
  if (!pickupCoords && !dropoffCoords) return null;

  // Build OpenStreetMap static image URL via markers
  const coords = dropoffCoords || pickupCoords!;
  const zoom = pickupCoords && dropoffCoords ? 12 : 14;
  const lat = pickupCoords && dropoffCoords
    ? (pickupCoords.lat + dropoffCoords.lat) / 2
    : coords.lat;
  const lng = pickupCoords && dropoffCoords
    ? (pickupCoords.lng + dropoffCoords.lng) / 2
    : coords.lng;

  return (
    <TouchableOpacity
      style={[styles.mapPreview, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image
        source={{
          uri: `https://static-maps.yandex.ru/v1?ll=${lng},${lat}&z=${zoom}&size=600,300&l=map&pt=${
            pickupCoords ? `${pickupCoords.lng},${pickupCoords.lat},pm2gnm~` : ''
          }${dropoffCoords ? `${dropoffCoords.lng},${dropoffCoords.lat},pm2rdm` : ''}`,
        }}
        style={styles.mapImage}
        resizeMode="cover"
      />
      <View style={styles.mapOverlay}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.mapOverlayContent}>
          <Ionicons name="navigate-circle-outline" size={20} color="#fff" />
          <Text style={styles.mapOverlayText}>Open in Navigator</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Quick Message Templates ──────────────────────────────────────────────────

const MESSAGE_TEMPLATES = [
  { id: 'arrived', label: "I've Arrived", message: "Hi! I've arrived at the pickup location. Ready when you are!", icon: 'location' as const },
  { id: 'delayed', label: 'Running Late', message: "Hi! I'm running about 5 minutes late due to traffic. Apologies!", icon: 'time' as const },
  { id: 'waiting', label: 'Waiting', message: "Hi! I'm waiting at the pickup point. Please let me know when you're ready.", icon: 'hourglass' as const },
  { id: 'confirming', label: 'Confirming Trip', message: 'Hi! Confirming your trip from {from} to {to}. See you soon!', icon: 'checkmark-circle' as const },
  { id: 'completed', label: 'Trip Completed', message: 'Thank you for choosing our service! Hope you had a great trip.', icon: 'star' as const },
  { id: 'cant_find', label: "Can't Find Location", message: "Hi! I'm having trouble finding the pickup location. Can you provide more details?", icon: 'help-circle' as const },
];

function QuickMessageButton({
  targetUserId,
  currentUserId,
  targetName,
  tripInfo,
  colors,
}: {
  targetUserId?: Id<"users">;
  currentUserId?: Id<"users">;
  targetName?: string;
  tripInfo?: { from: string; to: string };
  colors: any;
}) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [sending, setSending] = useState(false);
  const getOrCreateDM = useMutation(api.messenger.getOrCreatePersonalConversation);
  const sendMessage = useMutation(api.messenger.sendMessage);

  const canSend = !!(targetUserId && currentUserId);

  const handleSend = async (template: typeof MESSAGE_TEMPLATES[0]) => {
    if (!canSend || sending) return;
    setSending(true);
    try {
      let message = template.message;
      if (tripInfo) {
        message = message.replace('{from}', tripInfo.from).replace('{to}', tripInfo.to);
      }
      if (targetName) {
        message = message.replace('Hi!', `Hi ${targetName}!`);
      }
      const conversationId = await getOrCreateDM({
        userId: currentUserId!,
        otherUserId: targetUserId!,
      });
      await sendMessage({
        conversationId,
        senderId: currentUserId!,
        type: 'text',
        content: message,
      });
      Alert.alert('Sent', 'Message sent via Team Chat');
      setShowTemplates(false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!canSend) return null;

  return (
    <>
      <TouchableOpacity
        style={[commStyles.actionBtn, { backgroundColor: '#3b82f6' + '15', borderColor: '#3b82f6' + '30' }]}
        onPress={() => setShowTemplates(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="chatbubble-outline" size={16} color="#3b82f6" />
        <Text style={[commStyles.actionBtnText, { color: '#3b82f6' }]}>Message</Text>
      </TouchableOpacity>

      <Modal visible={showTemplates} transparent animationType="slide" onRequestClose={() => setShowTemplates(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTemplates(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Quick Messages</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {MESSAGE_TEMPLATES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[commStyles.templateItem, { borderColor: colors.border }]}
                  onPress={() => handleSend(t)}
                  disabled={sending}
                  activeOpacity={0.7}
                >
                  <Ionicons name={t.icon} size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }]}>{t.label}</Text>
                    <Text style={[{ fontSize: 12, color: colors.textMuted, marginTop: 2 }]} numberOfLines={2}>{t.message}</Text>
                  </View>
                  <Ionicons name="send" size={14} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── In-App Call Button ──────────────────────────────────────────────────────

function InAppCallButton({
  callerUserId,
  callerName,
  remoteUserId,
  remoteName,
  remotePhone,
  colors,
}: {
  callerUserId?: Id<"users">;
  callerName?: string;
  remoteUserId?: Id<"users">;
  remoteName?: string;
  remotePhone?: string;
  colors: any;
}) {
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [conversationId, setConversationId] = useState<Id<"chatConversations"> | null>(null);
  const [calling, setCalling] = useState(false);
  const getOrCreateDM = useMutation(api.messenger.getOrCreatePersonalConversation);
  const startCall = useMutation(api.messenger.startCall);

  const handleCall = async () => {
    if (!callerUserId || !remoteUserId || calling) {
      // Fallback to phone
      if (remotePhone) {
        Linking.openURL(`tel:${remotePhone}`);
      } else {
        Alert.alert('Error', 'No contact info available');
      }
      return;
    }
    setCalling(true);
    try {
      const convId = await getOrCreateDM({
        userId: callerUserId,
        otherUserId: remoteUserId,
      });
      setConversationId(convId);
      await startCall({
        conversationId: convId,
        initiatorId: callerUserId,
        callType: 'audio',
      });
      setCallModalVisible(true);
    } catch (e: any) {
      // Fallback to phone
      if (remotePhone) {
        Linking.openURL(`tel:${remotePhone}`);
      } else {
        Alert.alert('Error', e.message || 'Failed to start call');
      }
    } finally {
      setCalling(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[commStyles.actionBtn, { backgroundColor: '#10b981' + '15', borderColor: '#10b981' + '30' }]}
        onPress={handleCall}
        disabled={calling}
        activeOpacity={0.7}
      >
        {calling ? (
          <ActivityIndicator size="small" color="#10b981" />
        ) : (
          <Ionicons name="call-outline" size={16} color="#10b981" />
        )}
        <Text style={[commStyles.actionBtnText, { color: '#10b981' }]}>Call</Text>
      </TouchableOpacity>

      {callModalVisible && conversationId && callerUserId && (
        <CallModal
          visible={callModalVisible}
          callType="audio"
          conversationId={conversationId}
          currentUserId={callerUserId}
          remoteUserId={remoteUserId}
          remoteUserName={remoteName}
          onClose={() => setCallModalVisible(false)}
        />
      )}
    </>
  );
}

// ── Communication action styles ─────────────────────────────────────────────

const commStyles = StyleSheet.create({
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  actionsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10,
  },
  templateItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1,
  },
  approveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, flex: 1,
  },
  approveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

// ── Main screen ──────────────────────────────────────────────────────────────

export default function DriversScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
  const bottomOffset = TAB_BAR_HEIGHT + insets.bottom;

  const [activeTab, setActiveTab] = useState<TabType>('my_requests');
  const [navigatorModalVisible, setNavigatorModalVisible] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{
    pickup?: Coords;
    dropoff?: Coords;
    fromLabel?: string;
    toLabel?: string;
  } | null>(null);
  const [navigatorTarget, setNavigatorTarget] = useState<'pickup' | 'dropoff'>('dropoff');

  // New request form state
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [purpose, setPurpose] = useState('');
  const [passengerCount, setPassengerCount] = useState('1');
  const [notes, setNotes] = useState('');
  const [pickupCoords, setPickupCoords] = useState<Coords | undefined>();
  const [dropoffCoords, setDropoffCoords] = useState<Coords | undefined>();
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDriverPicker, setShowDriverPicker] = useState(false);

  const userId = user?.userId as any;
  const organizationId = user?.organizationId as any;
  const isDriver = user?.role === 'driver';

  // Available drivers for new request
  const availableDrivers = useQuery(
    api.drivers.getAvailableDrivers,
    organizationId ? { organizationId } : 'skip'
  );

  const requestDriverMutation = useMutation(api.drivers.requestDriver);
  const respondToRequest = useMutation(api.drivers.respondToDriverRequest);
  const submitPassengerRating = useMutation(api.drivers.submitPassengerRating);
  const reassignRequestMutation = useMutation(api.drivers.reassignDriverRequest);
  const addFavoriteMutation = useMutation(api.drivers.addFavoriteDriver);
  const removeFavoriteMutation = useMutation(api.drivers.removeFavoriteDriver);
  const createRecurringMutation = useMutation(api.drivers.createRecurringTrip);
  const toggleRecurringMutation = useMutation(api.drivers.toggleRecurringTrip);
  const deleteRecurringMutation = useMutation(api.drivers.deleteRecurringTrip);
  const markArrivedMutation = useMutation(api.drivers.markDriverArrived);
  const markPickedUpMutation = useMutation(api.drivers.markPassengerPickedUp);
  const updateETAMutation = useMutation(api.drivers.updateETA);
  const addDriverNotesMutation = useMutation(api.drivers.addDriverNotes);

  // New feature queries
  const completedTrips = useQuery(
    api.drivers.getCompletedTrips,
    userId ? { userId, limit: 50 } : 'skip'
  );
  const recurringTrips = useQuery(
    api.drivers.getRecurringTrips,
    userId ? { userId } : 'skip'
  );
  const favoriteDrivers = useQuery(
    api.drivers.getFavoriteDrivers,
    userId ? { userId } : 'skip'
  );
  
  // Rating modal state
  const [ratingModal, setRatingModal] = useState<{
    visible: boolean;
    scheduleId?: string;
    requestId?: string;
    driverId?: string;
    driverName?: string;
  }>({ visible: false });
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  
  // Reassign modal
  const [reassignModal, setReassignModal] = useState<{
    visible: boolean;
    requestId?: string;
    currentDriverId?: string;
  }>({ visible: false });
  const [reassignDriverId, setReassignDriverId] = useState('');

  // Driver notes state
  const [driverNotesModal, setDriverNotesModal] = useState<{ visible: boolean; scheduleId?: string; existing?: string }>({ visible: false });
  const [driverNotesText, setDriverNotesText] = useState('');
  
  // ETA state
  const [etaModal, setEtaModal] = useState<{ visible: boolean; scheduleId?: string }>({ visible: false });
  const [etaValue, setEtaValue] = useState('10');

  // Filter state
  const [filterCapacity, setFilterCapacity] = useState(0);
  const [filterSort, setFilterSort] = useState<'rating' | 'trips' | 'name'>('rating');

  const favoriteDriverIds = useMemo(() => {
    return new Set(favoriteDrivers?.map((f: any) => f?.driver?._id).filter(Boolean) ?? []);
  }, [favoriteDrivers]);

  const handleApprove = useCallback(async (requestId: Id<"driverRequests">) => {
    if (!driverRecord?._id) return;
    try {
      await respondToRequest({ requestId, driverId: driverRecord._id, userId, approved: true });
      Alert.alert('Approved', 'Trip request approved!');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to approve');
    }
  }, [respondToRequest, userId, driverRecord]);

  const handleDecline = useCallback(async (requestId: Id<"driverRequests">) => {
    if (!driverRecord?._id) return;
    try {
      await respondToRequest({ requestId, driverId: driverRecord._id, userId, approved: false });
      Alert.alert('Declined', 'Trip request declined.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to decline');
    }
  }, [respondToRequest, userId, driverRecord]);

  // Employee: my requests
  const myRequests = useQuery(
    api.drivers.getMyRequests,
    userId ? { userId } : 'skip'
  );

  // Driver: incoming requests
  const driverRecord = useQuery(
    api.drivers.getDriverByUserId,
    (isDriver && userId) ? { userId } : 'skip'
  );

  const driverRequests = useQuery(
    api.drivers.getDriverRequests,
    driverRecord?._id ? { driverId: driverRecord._id } : 'skip'
  );

  // Driver: my schedule
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAhead = now + 30 * 24 * 60 * 60 * 1000;

  const driverSchedule = useQuery(
    api.drivers.getDriverSchedule,
    driverRecord?._id
      ? { driverId: driverRecord._id, startTime: weekAgo, endTime: monthAhead }
      : 'skip'
  );

  const isLoading = myRequests === undefined;

  // ── Open navigator modal ───────────────────────────────────────────────────

  const handleOpenNavigator = useCallback((
    pickup?: Coords,
    dropoff?: Coords,
    fromLabel?: string,
    toLabel?: string,
  ) => {
    setSelectedCoords({ pickup, dropoff, fromLabel, toLabel });
    // Default to dropoff if available
    setNavigatorTarget(dropoff ? 'dropoff' : 'pickup');
    setNavigatorModalVisible(true);
  }, []);

  const navigatorOptions = useMemo(() => {
    if (!selectedCoords) return [];
    const coords = navigatorTarget === 'dropoff'
      ? selectedCoords.dropoff
      : selectedCoords.pickup;
    if (!coords) return [];
    const label = navigatorTarget === 'dropoff'
      ? selectedCoords.toLabel
      : selectedCoords.fromLabel;
    return getNavigatorOptions(coords, label).filter(n => n.available);
  }, [selectedCoords, navigatorTarget]);

  // ── Submit new request ──────────────────────────────────────────────────────

  const handleSubmitRequest = useCallback(async () => {
    if (!fromText.trim() || !toText.trim()) {
      Alert.alert('Missing fields', 'Please enter pickup and dropoff locations.');
      return;
    }
    if (!purpose.trim()) {
      Alert.alert('Missing fields', 'Please enter the trip purpose.');
      return;
    }
    if (!selectedDriverId) {
      Alert.alert('Missing fields', 'Please select a driver.');
      return;
    }
    if (!userId || !organizationId) return;

    setIsSubmitting(true);
    try {
      const now = Date.now();
      await requestDriverMutation({
        organizationId,
        requesterId: userId,
        driverId: selectedDriverId as any,
        startTime: now + 30 * 60 * 1000, // 30 min from now default
        endTime: now + 90 * 60 * 1000,   // 1.5h from now default
        tripInfo: {
          from: fromText,
          to: toText,
          purpose,
          passengerCount: parseInt(passengerCount) || 1,
          notes: notes || undefined,
          pickupCoords,
          dropoffCoords,
        },
      });
      Alert.alert('Success', 'Driver request submitted!');
      // Reset form
      setFromText('');
      setToText('');
      setPurpose('');
      setPassengerCount('1');
      setNotes('');
      setPickupCoords(undefined);
      setDropoffCoords(undefined);
      setSelectedDriverId('');
      setActiveTab('my_requests');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  }, [fromText, toText, purpose, selectedDriverId, userId, organizationId, passengerCount, notes, pickupCoords, dropoffCoords, requestDriverMutation]);

  // ── Format helpers ─────────────────────────────────────────────────────────

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDateTime = (ts: number) => `${formatDate(ts)}, ${formatTime(ts)}`;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {isDriver ? 'Driver Dashboard' : 'My Trips'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabRow, { borderBottomColor: colors.border, maxHeight: 44 }]}>
        {([
          { key: 'my_requests' as TabType, label: 'Active', icon: 'car-outline' },
          { key: 'history' as TabType, label: 'History', icon: 'time-outline' },
          { key: 'new_request' as TabType, label: 'New', icon: 'add-circle-outline' },
          { key: 'recurring' as TabType, label: 'Recurring', icon: 'repeat-outline' },
          ...(isDriver ? [{ key: 'schedule' as TabType, label: 'Schedule', icon: 'calendar-outline' }] : []),
        ]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabBtn,
              activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.key ? colors.primary : colors.textMuted}
            />
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.key ? colors.primary : colors.textMuted },
            ]} numberOfLines={1}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: bottomOffset + 20, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading...</Text>
          </View>
        ) : (
          <>
            {/* Employee view: My Requests */}
            {(!isDriver || activeTab === 'my_requests') && (
              <>
                {isDriver && driverRequests && driverRequests.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                      Incoming Requests
                    </Text>
                    {driverRequests
                      .filter((r: any) => r.status === 'pending')
                      .map((request: any) => (
                        <RequestCard
                          key={request._id}
                          request={request}
                          colors={colors}
                          isDriverView
                          formatDateTime={formatDateTime}
                          currentUserId={userId}
                          currentUserName={user?.name}
                          onApprove={handleApprove}
                          onDecline={handleDecline}
                          onOpenMap={() =>
                            handleOpenNavigator(
                              request.tripInfo.pickupCoords,
                              request.tripInfo.dropoffCoords,
                              request.tripInfo.from,
                              request.tripInfo.to,
                            )
                          }
                        />
                      ))
                    }
                  </>
                )}

                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  {isDriver ? 'All Requests' : 'My Trip Requests'}
                </Text>

                {(isDriver ? driverRequests : myRequests)?.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                    <Ionicons name="car-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Trips Yet</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                      {isDriver
                        ? 'No trip requests have been made yet.'
                        : 'Tap "New Request" to book a driver for your trip.'}
                    </Text>
                  </View>
                ) : (
                  (isDriver ? driverRequests : myRequests)?.map((request: any) => (
                    <RequestCard
                      key={request._id}
                      request={request}
                      colors={colors}
                      isDriverView={isDriver}
                      formatDateTime={formatDateTime}
                      currentUserId={userId}
                      currentUserName={user?.name}
                      organizationId={organizationId}
                      onApprove={isDriver ? handleApprove : undefined}
                      onDecline={isDriver ? handleDecline : undefined}
                      onReassign={(reqId) => {
                        setReassignModal({ visible: true, requestId: reqId, currentDriverId: request.driverId });
                        setReassignDriverId('');
                      }}
                      onOpenMap={() =>
                        handleOpenNavigator(
                          request.tripInfo.pickupCoords,
                          request.tripInfo.dropoffCoords,
                          request.tripInfo.from,
                          request.tripInfo.to,
                        )
                      }
                    />
                  ))
                )}
              </>
            )}

            {/* New Request form */}
            {activeTab === 'new_request' && (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 4 }]}>
                  Request a Driver
                </Text>

                {/* Driver picker */}
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Driver</Text>
                <TouchableOpacity
                  style={[styles.pickerBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                  onPress={() => setShowDriverPicker(true)}
                >
                  <Ionicons name="car-sport-outline" size={18} color={colors.textMuted} />
                  <Text style={[styles.pickerBtnText, { color: selectedDriverId ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>
                    {selectedDriverId
                      ? (availableDrivers?.find((d: any) => d._id === selectedDriverId) as any)?.userName
                        ? `${(availableDrivers?.find((d: any) => d._id === selectedDriverId) as any).userName} - ${(availableDrivers?.find((d: any) => d._id === selectedDriverId) as any).vehicleInfo.model}`
                        : 'Selected'
                      : 'Choose a driver...'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                </TouchableOpacity>

                {/* Pickup */}
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>Pickup Location</Text>
                <PlaceAutocomplete
                  value={fromText}
                  onChangeText={(t) => { setFromText(t); setPickupCoords(undefined); }}
                  onSelect={(p) => { setFromText(p.address); setPickupCoords({ lat: p.lat, lng: p.lng }); }}
                  placeholder="e.g., Office, Home..."
                  colors={colors}
                  dotColor="#10b981"
                />

                {/* Dropoff */}
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>Dropoff Location</Text>
                <PlaceAutocomplete
                  value={toText}
                  onChangeText={(t) => { setToText(t); setDropoffCoords(undefined); }}
                  onSelect={(p) => { setToText(p.address); setDropoffCoords({ lat: p.lat, lng: p.lng }); }}
                  placeholder="e.g., Airport, Hotel..."
                  colors={colors}
                  dotColor="#ef4444"
                />

                {/* Purpose */}
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>Trip Purpose</Text>
                <TextInput
                  value={purpose}
                  onChangeText={setPurpose}
                  placeholder="e.g., Airport transfer, Client meeting"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.textInputField, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
                />

                {/* Passenger count */}
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>Passengers</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => setPassengerCount(String(Math.max(1, parseInt(passengerCount) - 1)))}
                    style={[styles.countBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                  >
                    <Ionicons name="remove" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[{ fontSize: 18, fontWeight: '700', minWidth: 30, textAlign: 'center', color: colors.textPrimary }]}>
                    {passengerCount}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setPassengerCount(String(Math.min(10, parseInt(passengerCount) + 1)))}
                    style={[styles.countBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                  >
                    <Ionicons name="add" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Notes */}
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>Notes (optional)</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Additional info for the driver..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  style={[styles.textInputField, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary, minHeight: 70, textAlignVertical: 'top' }]}
                />

                {/* Map preview if coords set */}
                {(pickupCoords || dropoffCoords) && (
                  <MapPreview
                    pickupCoords={pickupCoords}
                    dropoffCoords={dropoffCoords}
                    colors={colors}
                    onPress={() => handleOpenNavigator(pickupCoords, dropoffCoords, fromText, toText)}
                  />
                )}

                {/* Submit */}
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: isSubmitting ? 0.6 : 1 }]}
                  onPress={handleSubmitRequest}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send-outline" size={18} color="#fff" />
                      <Text style={styles.submitBtnText}>Submit Request</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Feature #2: History Tab - Completed Trips */}
            {activeTab === 'history' && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Completed Trips
                </Text>
                {(!completedTrips || completedTrips.length === 0) ? (
                  <View style={[styles.emptyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                    <Ionicons name="time-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No History</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                      Completed trips will appear here.
                    </Text>
                  </View>
                ) : (
                  completedTrips.map((trip: any) => (
                    <View key={trip._id} style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardHeaderLeft}>
                          <Ionicons name="checkmark-done-outline" size={20} color="#10b981" />
                          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                            {trip.tripInfo.from} → {trip.tripInfo.to}
                          </Text>
                        </View>
                        <StatusBadge status="completed" colors={colors} />
                      </View>
                      <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                          <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                          <Text style={[styles.infoText, { color: colors.textMuted }]}>{trip.driverName}</Text>
                        </View>
                        <View style={styles.infoItem}>
                          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                          <Text style={[styles.infoText, { color: colors.textMuted }]}>{formatDateTime(trip.startTime)}</Text>
                        </View>
                      </View>
                      {trip.driverNotes && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                          <Ionicons name="document-text-outline" size={14} color={colors.textMuted} />
                          <Text style={{ fontSize: 12, fontStyle: 'italic', color: colors.textMuted }}>{trip.driverNotes}</Text>
                        </View>
                      )}
                      {trip.waitTimeMinutes != null && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                          <Ionicons name="hourglass-outline" size={14} color={colors.textMuted} />
                          <Text style={{ fontSize: 12, color: colors.textMuted }}>Wait: {trip.waitTimeMinutes} min</Text>
                        </View>
                      )}
                      {/* Rating */}
                      {trip.hasRated ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 }}>
                          <Text style={{ fontSize: 12, color: colors.textMuted }}>Your rating: </Text>
                          {[1,2,3,4,5].map(s => (
                            <Ionicons key={s} name={s <= (trip.passengerRating ?? 0) ? 'star' : 'star-outline'} size={14} color="#f59e0b" />
                          ))}
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[commStyles.actionBtn, { backgroundColor: '#f59e0b15', borderColor: '#f59e0b30', marginTop: 6 }]}
                          onPress={() => {
                            setRatingModal({ visible: true, scheduleId: trip.scheduleId, requestId: trip._id, driverId: trip.driverId, driverName: trip.driverName });
                            setRatingValue(5);
                            setRatingComment('');
                          }}
                        >
                          <Ionicons name="star-outline" size={16} color="#f59e0b" />
                          <Text style={[commStyles.actionBtnText, { color: '#f59e0b' }]}>Rate Driver</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                )}
              </>
            )}

            {/* Feature #5: Recurring Trips Tab */}
            {activeTab === 'recurring' && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Recurring Trips
                </Text>
                {(!recurringTrips || recurringTrips.length === 0) ? (
                  <View style={[styles.emptyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                    <Ionicons name="repeat-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Recurring Trips</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                      Set up daily commutes from the web app.
                    </Text>
                  </View>
                ) : (
                  recurringTrips.map((trip: any) => (
                    <View key={trip._id} style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                      <View style={styles.cardHeader}>
                        <View style={styles.cardHeaderLeft}>
                          <Ionicons name="repeat-outline" size={20} color={colors.primary} />
                          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                            {trip.tripInfo.from} → {trip.tripInfo.to}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: trip.isActive ? '#10b98118' : '#6b728018' }]}>
                          <Ionicons name={trip.isActive ? 'checkmark-circle' : 'pause-circle'} size={12} color={trip.isActive ? '#10b981' : '#6b7280'} />
                          <Text style={[styles.statusBadgeText, { color: trip.isActive ? '#10b981' : '#6b7280' }]}>{trip.isActive ? 'Active' : 'Paused'}</Text>
                        </View>
                      </View>
                      <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                          <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                          <Text style={[styles.infoText, { color: colors.textMuted }]}>{trip.driverName}</Text>
                        </View>
                        <View style={styles.infoItem}>
                          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                          <Text style={[styles.infoText, { color: colors.textMuted }]}>{trip.schedule.startTime} - {trip.schedule.endTime}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 8 }}>
                        {trip.schedule.daysOfWeek.map((d: number) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ')}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[commStyles.actionBtn, { backgroundColor: trip.isActive ? '#ef444415' : '#10b98115', borderColor: trip.isActive ? '#ef444430' : '#10b98130' }]}
                          onPress={async () => {
                            try {
                              await toggleRecurringMutation({ recurringTripId: trip._id, userId, isActive: !trip.isActive });
                              Alert.alert('Success', trip.isActive ? 'Paused' : 'Activated');
                            } catch (e: any) { Alert.alert('Error', e.message); }
                          }}
                        >
                          <Ionicons name={trip.isActive ? 'pause' : 'play'} size={16} color={trip.isActive ? '#ef4444' : '#10b981'} />
                          <Text style={[commStyles.actionBtnText, { color: trip.isActive ? '#ef4444' : '#10b981' }]}>{trip.isActive ? 'Pause' : 'Activate'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[commStyles.actionBtn, { backgroundColor: '#ef444415', borderColor: '#ef444430' }]}
                          onPress={() => Alert.alert('Delete?', 'Remove this recurring trip?', [
                            { text: 'Cancel' },
                            { text: 'Delete', style: 'destructive', onPress: async () => {
                              try { await deleteRecurringMutation({ recurringTripId: trip._id, userId }); } catch (e: any) { Alert.alert('Error', e.message); }
                            }},
                          ])}
                        >
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}

            {/* Feature #3: Reassign button on declined requests - handled in RequestCard */}

            {/* Driver schedule view */}
            {isDriver && activeTab === 'schedule' && (
              <>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Upcoming Schedule
                </Text>
                {(!driverSchedule || driverSchedule.length === 0) ? (
                  <View style={[styles.emptyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                    <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Schedule</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                      No upcoming trips or blocked times.
                    </Text>
                  </View>
                ) : (
                  driverSchedule
                    .filter((s: any) => s.status !== 'cancelled')
                    .sort((a: any, b: any) => a.startTime - b.startTime)
                    .map((schedule: any) => (
                      <ScheduleCard
                        key={schedule._id}
                        schedule={schedule}
                        colors={colors}
                        formatDateTime={formatDateTime}
                        currentUserId={userId}
                        currentUserName={user?.name}
                        onMarkArrived={async (sid: any) => {
                          try { await markArrivedMutation({ scheduleId: sid, userId }); Alert.alert('Done', 'Marked as arrived!'); } catch (e: any) { Alert.alert('Error', e.message); }
                        }}
                        onMarkPickedUp={async (sid: any) => {
                          try { const r = await markPickedUpMutation({ scheduleId: sid, userId }); Alert.alert('Done', `Passenger picked up! Wait: ${r.waitTimeMinutes} min`); } catch (e: any) { Alert.alert('Error', e.message); }
                        }}
                        onSetETA={(sid: any) => { setEtaModal({ visible: true, scheduleId: sid }); setEtaValue('10'); }}
                        onAddNotes={(sid: any, existing?: string) => { setDriverNotesModal({ visible: true, scheduleId: sid, existing }); setDriverNotesText(existing || ''); }}
                        onOpenMap={() => {
                          if (schedule.tripInfo) {
                            handleOpenNavigator(
                              schedule.tripInfo.pickupCoords,
                              schedule.tripInfo.dropoffCoords,
                              schedule.tripInfo.from,
                              schedule.tripInfo.to,
                            );
                          }
                        }}
                      />
                    ))
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Driver Picker Modal */}
      <Modal
        visible={showDriverPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDriverPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDriverPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard, maxHeight: '60%' }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Driver</Text>

            {/* Filters */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <TouchableOpacity
                style={[{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border }, filterCapacity > 0 && { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                onPress={() => setFilterCapacity(filterCapacity >= 6 ? 0 : filterCapacity + 2)}
              >
                <Text style={{ fontSize: 11, color: filterCapacity > 0 ? colors.primary : colors.textMuted }}>
                  {filterCapacity > 0 ? `${filterCapacity}+ seats` : 'Any seats'}
                </Text>
              </TouchableOpacity>
              {(['rating', 'trips', 'name'] as const).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border }, filterSort === s && { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                  onPress={() => setFilterSort(s)}
                >
                  <Text style={{ fontSize: 11, color: filterSort === s ? colors.primary : colors.textMuted }}>
                    {s === 'rating' ? '⭐ Rating' : s === 'trips' ? '🚗 Trips' : '🔤 Name'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {!availableDrivers || availableDrivers.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Ionicons name="car-outline" size={40} color={colors.textMuted} />
                <Text style={[{ color: colors.textMuted, marginTop: 8, fontSize: 14 }]}>No drivers available</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {[...availableDrivers]
                  .filter((d: any) => filterCapacity <= 0 || d.vehicleInfo.capacity >= filterCapacity)
                  .sort((a: any, b: any) => {
                    // Favorites first
                    const aFav = favoriteDriverIds.has(a._id) ? 0 : 1;
                    const bFav = favoriteDriverIds.has(b._id) ? 0 : 1;
                    if (aFav !== bFav) return aFav - bFav;
                    if (filterSort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0);
                    if (filterSort === 'trips') return (b.totalTrips ?? 0) - (a.totalTrips ?? 0);
                    return (a.userName ?? '').localeCompare(b.userName ?? '');
                  })
                  .map((driver: any) => (
                  <TouchableOpacity
                    key={driver._id}
                    style={[
                      styles.driverPickerItem,
                      { borderColor: colors.border },
                      selectedDriverId === driver._id && { backgroundColor: colors.primary + '12', borderColor: colors.primary },
                    ]}
                    onPress={() => { setSelectedDriverId(driver._id); setShowDriverPicker(false); }}
                  >
                    <View style={[styles.driverAvatar, { backgroundColor: colors.primary + '18' }]}>
                      <Ionicons name="person" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }]}>
                        {driver.userName}
                      </Text>
                      <Text style={[{ fontSize: 12, color: colors.textMuted }]}>
                        {driver.vehicleInfo.model} · {driver.vehicleInfo.plateNumber}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {favoriteDriverIds.has(driver._id) && (
                        <Ionicons name="heart" size={12} color="#ef4444" />
                      )}
                      <Ionicons name="star" size={12} color="#f59e0b" />
                      <Text style={[{ fontSize: 12, color: colors.textMuted }]}>{driver.rating.toFixed(1)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Navigator Picker Modal */}
      <Modal
        visible={navigatorModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNavigatorModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNavigatorModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Open in Navigator
            </Text>

            {/* Target toggle (pickup / dropoff) */}
            {selectedCoords?.pickup && selectedCoords?.dropoff && (
              <View style={[styles.targetToggle, { borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.targetBtn,
                    navigatorTarget === 'pickup' && { backgroundColor: '#10b981' + '20' },
                  ]}
                  onPress={() => setNavigatorTarget('pickup')}
                >
                  <View style={[styles.targetDot, { backgroundColor: '#10b981' }]} />
                  <Text style={[
                    styles.targetText,
                    { color: navigatorTarget === 'pickup' ? '#10b981' : colors.textMuted },
                  ]} numberOfLines={1}>
                    {selectedCoords.fromLabel || 'Pickup'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.targetBtn,
                    navigatorTarget === 'dropoff' && { backgroundColor: '#ef4444' + '20' },
                  ]}
                  onPress={() => setNavigatorTarget('dropoff')}
                >
                  <View style={[styles.targetDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={[
                    styles.targetText,
                    { color: navigatorTarget === 'dropoff' ? '#ef4444' : colors.textMuted },
                  ]} numberOfLines={1}>
                    {selectedCoords.toLabel || 'Dropoff'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Navigator options */}
            <View style={styles.navGrid}>
              {navigatorOptions.map(nav => (
                <TouchableOpacity
                  key={nav.id}
                  style={[styles.navOption, { backgroundColor: nav.color + '12', borderColor: nav.color + '30' }]}
                  onPress={async () => {
                    const coords = navigatorTarget === 'dropoff'
                      ? selectedCoords?.dropoff
                      : selectedCoords?.pickup;
                    if (coords) {
                      setNavigatorModalVisible(false);
                      const label = navigatorTarget === 'dropoff'
                        ? selectedCoords?.toLabel
                        : selectedCoords?.fromLabel;
                      await openNavigator(nav, coords, label);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.navIconWrap, { backgroundColor: nav.color + '20' }]}>
                    <Ionicons name={nav.icon as any} size={24} color={nav.color} />
                  </View>
                  <Text style={[styles.navName, { color: colors.textPrimary }]}>{nav.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Cancel */}
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={() => setNavigatorModalVisible(false)}
            >
              <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Feature #1: Rating Modal */}
      <Modal visible={ratingModal.visible} transparent animationType="slide" onRequestClose={() => setRatingModal({ visible: false })}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setRatingModal({ visible: false })}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Rate {ratingModal.driverName || 'Driver'}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
              {[1,2,3,4,5].map(s => (
                <TouchableOpacity key={s} onPress={() => setRatingValue(s)}>
                  <Ionicons name={s <= ratingValue ? 'star' : 'star-outline'} size={36} color="#f59e0b" />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={ratingComment}
              onChangeText={setRatingComment}
              placeholder="Share your experience... (optional)"
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.textInputField, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary, minHeight: 60, textAlignVertical: 'top', marginBottom: 12 }]}
            />
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={async () => {
                if (!ratingModal.scheduleId || !ratingModal.driverId || !userId || !organizationId) return;
                try {
                  await submitPassengerRating({
                    scheduleId: ratingModal.scheduleId as any,
                    requestId: ratingModal.requestId as any,
                    passengerId: userId,
                    driverId: ratingModal.driverId as any,
                    organizationId,
                    rating: ratingValue,
                    comment: ratingComment || undefined,
                  });
                  Alert.alert('Thank you!', 'Rating submitted.');
                  setRatingModal({ visible: false });
                } catch (e: any) { Alert.alert('Error', e.message); }
              }}
            >
              <Ionicons name="star" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Submit Rating</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Feature #3: Reassign Modal */}
      <Modal visible={reassignModal.visible} transparent animationType="slide" onRequestClose={() => setReassignModal({ visible: false })}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setReassignModal({ visible: false })}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Request Another Driver</Text>
            <ScrollView style={{ maxHeight: 250 }}>
              {availableDrivers
                ?.filter((d: any) => d._id !== reassignModal.currentDriverId)
                .map((driver: any) => (
                  <TouchableOpacity
                    key={driver._id}
                    style={[styles.driverPickerItem, { borderColor: colors.border }, reassignDriverId === driver._id && { backgroundColor: colors.primary + '12', borderColor: colors.primary }]}
                    onPress={() => setReassignDriverId(driver._id)}
                  >
                    <View style={[styles.driverAvatar, { backgroundColor: colors.primary + '18' }]}>
                      <Ionicons name="person" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>{driver.userName}</Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>{driver.vehicleInfo.model} · ⭐{driver.rating.toFixed(1)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: reassignDriverId ? 1 : 0.5, marginTop: 12 }]}
              disabled={!reassignDriverId}
              onPress={async () => {
                if (!reassignModal.requestId || !reassignDriverId || !userId) return;
                try {
                  await reassignRequestMutation({ requestId: reassignModal.requestId as any, userId, newDriverId: reassignDriverId as any });
                  Alert.alert('Success', 'Request sent to new driver!');
                  setReassignModal({ visible: false });
                } catch (e: any) { Alert.alert('Error', e.message); }
              }}
            >
              <Ionicons name="swap-horizontal" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Send Request</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Feature #9: ETA Modal */}
      <Modal visible={etaModal.visible} transparent animationType="slide" onRequestClose={() => setEtaModal({ visible: false })}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEtaModal({ visible: false })}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Set ETA (minutes)</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
              {[5, 10, 15, 20, 30].map(min => (
                <TouchableOpacity
                  key={min}
                  style={[{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border }, etaValue === String(min) && { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                  onPress={() => setEtaValue(String(min))}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: etaValue === String(min) ? colors.primary : colors.textPrimary }}>{min}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={async () => {
                if (!etaModal.scheduleId || !userId) return;
                try {
                  await updateETAMutation({ scheduleId: etaModal.scheduleId as any, userId, etaMinutes: parseInt(etaValue) || 10 });
                  Alert.alert('Sent', `ETA: ${etaValue} minutes sent to passenger.`);
                  setEtaModal({ visible: false });
                } catch (e: any) { Alert.alert('Error', e.message); }
              }}
            >
              <Ionicons name="navigate" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Send ETA</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Feature #7: Driver Notes Modal */}
      <Modal visible={driverNotesModal.visible} transparent animationType="slide" onRequestClose={() => setDriverNotesModal({ visible: false })}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDriverNotesModal({ visible: false })}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Trip Notes</Text>
            <TextInput
              value={driverNotesText}
              onChangeText={setDriverNotesText}
              placeholder="e.g., Traffic on Lenin St, passenger was late..."
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.textInputField, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 }]}
            />
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={async () => {
                if (!driverNotesModal.scheduleId || !userId) return;
                try {
                  await addDriverNotesMutation({ scheduleId: driverNotesModal.scheduleId as any, userId, notes: driverNotesText });
                  Alert.alert('Saved', 'Note saved.');
                  setDriverNotesModal({ visible: false });
                } catch (e: any) { Alert.alert('Error', e.message); }
              }}
            >
              <Ionicons name="document-text" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Save Note</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({
  request,
  colors,
  isDriverView,
  formatDateTime,
  onOpenMap,
  currentUserId,
  currentUserName,
  onApprove,
  onDecline,
}: {
  request: any;
  colors: any;
  isDriverView: boolean;
  formatDateTime: (ts: number) => string;
  onOpenMap: () => void;
  currentUserId?: Id<"users">;
  currentUserName?: string;
  organizationId?: any;
  onApprove?: (id: Id<"driverRequests">) => void;
  onDecline?: (id: Id<"driverRequests">) => void;
  onReassign?: (id: string) => void;
}) {
  const hasCoords = request.tripInfo.pickupCoords || request.tripInfo.dropoffCoords;

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Ionicons name="car-sport-outline" size={20} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {request.tripInfo.purpose}
          </Text>
        </View>
        <StatusBadge status={request.status} colors={colors} />
      </View>

      {/* Route */}
      <View style={styles.routeWrap}>
        <View style={styles.routeLine}>
          <View style={[styles.routeDot, { backgroundColor: '#10b981' }]} />
          <View style={[styles.routeDash, { backgroundColor: colors.border }]} />
          <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
        </View>
        <View style={styles.routeTexts}>
          <Text style={[styles.routeFrom, { color: colors.textPrimary }]} numberOfLines={2}>
            {request.tripInfo.from}
          </Text>
          <Text style={[styles.routeTo, { color: colors.textPrimary }]} numberOfLines={2}>
            {request.tripInfo.to}
          </Text>
        </View>
      </View>

      {/* Info row */}
      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            {formatDateTime(request.startTime)}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="people-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            {request.tripInfo.passengerCount} pax
          </Text>
        </View>
      </View>

      {/* Driver / Requester info */}
      <View style={styles.personRow}>
        <Ionicons
          name={isDriverView ? 'person-outline' : 'car-outline'}
          size={14}
          color={colors.textMuted}
        />
        <Text style={[styles.personText, { color: colors.textMuted }]}>
          {isDriverView
            ? request.requesterName || 'Employee'
            : request.driverName || 'Driver'}
        </Text>
        {request.driverVehicle && !isDriverView && (
          <Text style={[styles.vehicleText, { color: colors.textMuted }]}>
            {' '}· {request.driverVehicle.model} ({request.driverVehicle.plateNumber})
          </Text>
        )}
      </View>

      {/* Notes */}
      {request.tripInfo.notes ? (
        <Text style={[styles.notesText, { color: colors.textMuted }]} numberOfLines={2}>
          {request.tripInfo.notes}
        </Text>
      ) : null}

      {/* Map preview + Navigate button */}
      {hasCoords && (
        <MapPreview
          pickupCoords={request.tripInfo.pickupCoords}
          dropoffCoords={request.tripInfo.dropoffCoords}
          colors={colors}
          onPress={onOpenMap}
        />
      )}

      {/* Navigate button (always shown if coords exist) */}
      {hasCoords && (
        <TouchableOpacity
          style={[styles.navigateBtn, { backgroundColor: colors.primary + '12' }]}
          onPress={onOpenMap}
          activeOpacity={0.7}
        >
          <Ionicons name="navigate-outline" size={18} color={colors.primary} />
          <Text style={[styles.navigateBtnText, { color: colors.primary }]}>
            Open Route in Navigator
          </Text>
        </TouchableOpacity>
      )}

      {/* Communication: Call + Message */}
      <View style={commStyles.actionsRow}>
        <InAppCallButton
          callerUserId={currentUserId}
          callerName={currentUserName}
          remoteUserId={isDriverView ? request.requesterId : request.driverUserId}
          remoteName={isDriverView ? request.requesterName : request.driverName}
          remotePhone={isDriverView ? request.requesterPhone : request.driverPhone}
          colors={colors}
        />
        <QuickMessageButton
          currentUserId={currentUserId}
          targetUserId={isDriverView ? request.requesterId : request.driverUserId}
          targetName={isDriverView ? request.requesterName : request.driverName}
          tripInfo={{ from: request.tripInfo.from, to: request.tripInfo.to }}
          colors={colors}
        />
      </View>

      {/* Feature #3: Reassign button for declined requests */}
      {!isDriverView && request.status === 'declined' && request.declineReason && (
        <View style={{ marginTop: 6 }}>
          <Text style={{ fontSize: 11, color: '#ef4444', marginBottom: 6 }}>Reason: {request.declineReason}</Text>
          <TouchableOpacity
            style={[commStyles.actionBtn, { backgroundColor: '#8b5cf615', borderColor: '#8b5cf630' }]}
            onPress={() => {
              if (onReassign) onReassign(request._id);
            }}
          >
            <Ionicons name="swap-horizontal-outline" size={16} color="#8b5cf6" />
            <Text style={[commStyles.actionBtnText, { color: '#8b5cf6' }]}>Request Another Driver</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Feature #9: ETA display */}
      {!isDriverView && request.status === 'approved' && request.etaMinutes != null && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#3b82f610', borderRadius: 8 }}>
          <Ionicons name="navigate-outline" size={16} color="#3b82f6" />
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#3b82f6' }}>ETA: ~{request.etaMinutes} min</Text>
        </View>
      )}

      {/* Approve / Decline for driver's incoming pending requests */}
      {isDriverView && request.status === 'pending' && onApprove && onDecline && (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <TouchableOpacity
            style={[commStyles.approveBtn, { backgroundColor: '#10b981' }]}
            onPress={() => onApprove(request._id)}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={commStyles.approveBtnText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[commStyles.approveBtn, { backgroundColor: '#ef4444' }]}
            onPress={() => onDecline(request._id)}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={18} color="#fff" />
            <Text style={commStyles.approveBtnText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Schedule Card ────────────────────────────────────────────────────────────

function ScheduleCard({
  schedule,
  colors,
  formatDateTime,
  onOpenMap,
  currentUserId,
  currentUserName,
}: {
  schedule: any;
  colors: any;
  formatDateTime: (ts: number) => string;
  onOpenMap: () => void;
  currentUserId?: Id<"users">;
  currentUserName?: string;
  onMarkArrived?: (scheduleId: any) => void;
  onMarkPickedUp?: (scheduleId: any) => void;
  onSetETA?: (scheduleId: any) => void;
  onAddNotes?: (scheduleId: any, existing?: string) => void;
}) {
  const isTrip = schedule.type === 'trip';
  const hasCoords = schedule.tripInfo?.pickupCoords || schedule.tripInfo?.dropoffCoords;
  const typeConfig: Record<string, { color: string; icon: string; label: string }> = {
    trip:        { color: '#3b82f6', icon: 'car-outline',    label: 'Trip' },
    blocked:     { color: '#ef4444', icon: 'ban-outline',    label: 'Blocked' },
    maintenance: { color: '#f59e0b', icon: 'build-outline',  label: 'Maintenance' },
    time_off:    { color: '#8b5cf6', icon: 'bed-outline',    label: 'Time Off' },
  };
  const tc = typeConfig[schedule.type] ?? typeConfig.blocked;

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.typeIcon, { backgroundColor: tc.color + '18' }]}>
            <Ionicons name={tc.icon as any} size={16} color={tc.color} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            {isTrip && schedule.tripInfo
              ? `${schedule.tripInfo.from} → ${schedule.tripInfo.to}`
              : schedule.reason || tc.label
            }
          </Text>
        </View>
        <StatusBadge status={schedule.status} colors={colors} />
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            {formatDateTime(schedule.startTime)} - {formatDateTime(schedule.endTime)}
          </Text>
        </View>
      </View>

      {isTrip && schedule.tripInfo && (
        <>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="briefcase-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textMuted }]}>
                {schedule.tripInfo.purpose}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textMuted }]}>
                {schedule.tripInfo.passengerCount} pax
              </Text>
            </View>
          </View>

          {schedule.tripInfo.distanceKm && (
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="speedometer-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.infoText, { color: colors.textMuted }]}>
                  {schedule.tripInfo.distanceKm} km · {schedule.tripInfo.durationMinutes} min
                </Text>
              </View>
            </View>
          )}

          {hasCoords && (
            <TouchableOpacity
              style={[styles.navigateBtn, { backgroundColor: colors.primary + '12' }]}
              onPress={onOpenMap}
              activeOpacity={0.7}
            >
              <Ionicons name="navigate-outline" size={18} color={colors.primary} />
              <Text style={[styles.navigateBtnText, { color: colors.primary }]}>
                Open Route in Navigator
              </Text>
            </TouchableOpacity>
          )}

          {/* Communication buttons for trips */}
          {schedule.userName && (
            <View style={commStyles.actionsRow}>
              <InAppCallButton
                callerUserId={currentUserId}
                callerName={currentUserName}
                remoteUserId={schedule.requesterId}
                remoteName={schedule.userName}
                remotePhone={schedule.requesterPhone}
                colors={colors}
              />
              <QuickMessageButton
                currentUserId={currentUserId}
                targetUserId={schedule.requesterId}
                targetName={schedule.userName}
                tripInfo={schedule.tripInfo ? { from: schedule.tripInfo.from, to: schedule.tripInfo.to } : undefined}
                colors={colors}
              />
            </View>
          )}

          {/* Feature #8: Arrived / Picked Up */}
          {(schedule.status === 'scheduled' || schedule.status === 'in_progress') && (
            <View style={[commStyles.actionsRow, { marginTop: 6 }]}>
              {schedule.status === 'scheduled' && !schedule.arrivedAt && onMarkArrived && (
                <TouchableOpacity
                  style={[commStyles.actionBtn, { backgroundColor: '#10b98115', borderColor: '#10b98130' }]}
                  onPress={() => onMarkArrived(schedule._id)}
                >
                  <Ionicons name="location" size={16} color="#10b981" />
                  <Text style={[commStyles.actionBtnText, { color: '#10b981' }]}>I've Arrived</Text>
                </TouchableOpacity>
              )}
              {schedule.arrivedAt && !schedule.passengerPickedUpAt && (
                <>
                  <View style={[styles.statusBadge, { backgroundColor: '#f59e0b18' }]}>
                    <Ionicons name="hourglass-outline" size={12} color="#f59e0b" />
                    <Text style={[styles.statusBadgeText, { color: '#f59e0b' }]}>Waiting: {Math.round((Date.now() - schedule.arrivedAt) / 60000)} min</Text>
                  </View>
                  {onMarkPickedUp && (
                    <TouchableOpacity
                      style={[commStyles.actionBtn, { backgroundColor: '#3b82f615', borderColor: '#3b82f630' }]}
                      onPress={() => onMarkPickedUp(schedule._id)}
                    >
                      <Ionicons name="people" size={16} color="#3b82f6" />
                      <Text style={[commStyles.actionBtnText, { color: '#3b82f6' }]}>Passenger In</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* Feature #9: ETA */}
              {schedule.status === 'scheduled' && !schedule.arrivedAt && onSetETA && (
                <TouchableOpacity
                  style={[commStyles.actionBtn, { backgroundColor: '#8b5cf615', borderColor: '#8b5cf630' }]}
                  onPress={() => onSetETA(schedule._id)}
                >
                  <Ionicons name="navigate-outline" size={16} color="#8b5cf6" />
                  <Text style={[commStyles.actionBtnText, { color: '#8b5cf6' }]}>Set ETA</Text>
                </TouchableOpacity>
              )}

              {/* Feature #7: Notes */}
              {onAddNotes && (
                <TouchableOpacity
                  style={[commStyles.actionBtn, { backgroundColor: '#6b728015', borderColor: '#6b728030' }]}
                  onPress={() => onAddNotes(schedule._id, schedule.driverNotes)}
                >
                  <Ionicons name="document-text-outline" size={16} color="#6b7280" />
                  <Text style={[commStyles.actionBtnText, { color: '#6b7280' }]}>{schedule.driverNotes ? 'Edit Note' : 'Add Note'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {schedule.driverNotes && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <Ionicons name="document-text" size={12} color={colors.textMuted} />
              <Text style={{ fontSize: 11, fontStyle: 'italic', color: colors.textMuted }}>{schedule.driverNotes}</Text>
            </View>
          )}
          {schedule.waitTimeMinutes != null && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons name="hourglass" size={12} color={colors.textMuted} />
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Wait time: {schedule.waitTimeMinutes} min</Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  tabRow: {
    flexDirection: 'row' as const, paddingHorizontal: 16, borderBottomWidth: 1,
    flexGrow: 0, flexShrink: 0,
  },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 16, marginRight: 8,
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  scrollView: { flex: 1 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  loadingText: { fontSize: 14, marginTop: 12 },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 12 },

  card: {
    borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 15, fontWeight: '600', flex: 1 },

  routeWrap: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  routeLine: { alignItems: 'center', paddingVertical: 2, width: 14 },
  routeDot: { width: 10, height: 10, borderRadius: 5 },
  routeDash: { width: 2, flex: 1, marginVertical: 4 },
  routeTexts: { flex: 1, justifyContent: 'space-between', gap: 8 },
  routeFrom: { fontSize: 13 },
  routeTo: { fontSize: 13 },

  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 8 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoText: { fontSize: 12 },

  personRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  personText: { fontSize: 12 },
  vehicleText: { fontSize: 12 },

  notesText: { fontSize: 12, fontStyle: 'italic', marginBottom: 8 },

  typeIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },

  mapPreview: {
    borderRadius: 12, overflow: 'hidden', borderWidth: 1, marginBottom: 8, height: 150,
  },
  mapImage: { width: '100%', height: '100%' },
  mapOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
  },
  mapOverlayContent: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  mapOverlayText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  navigateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 10, borderRadius: 10, marginTop: 4,
  },
  navigateBtnText: { fontSize: 14, fontWeight: '600' },

  emptyCard: {
    borderRadius: 14, borderWidth: 1, padding: 32, alignItems: 'center', gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },

  // Modal
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 },

  targetToggle: {
    flexDirection: 'column', borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 16, gap: 2,
  },
  targetBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingVertical: 10, paddingHorizontal: 14,
  },
  targetDot: { width: 8, height: 8, borderRadius: 4 },
  targetText: { fontSize: 13, fontWeight: '500', flex: 1 },

  navGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  navOption: {
    width: '30%', flexGrow: 1, alignItems: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 12, borderWidth: 1,
  },
  navIconWrap: {
    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
  },
  navName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  cancelBtn: {
    marginTop: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600' },

  // PlaceAutocomplete
  autocompleteInput: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1,
    height: 44, paddingLeft: 12, paddingRight: 6, gap: 8,
  },
  autocompleteDot: { width: 8, height: 8, borderRadius: 4 },
  autocompleteTextInput: { flex: 1, fontSize: 14, height: '100%' },
  autocompleteActionWrap: {
    position: 'absolute', right: 1, top: 1, bottom: 1,
    borderTopRightRadius: 9, borderBottomRightRadius: 9,
    justifyContent: 'center', alignItems: 'center',
    paddingLeft: 16, paddingRight: 10,
  },
  autocompleteClearBtn: {
    padding: 2,
  },
  suggestionsDropdown: {
    position: 'absolute', top: 48, left: 0, right: 0,
    borderRadius: 10, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
    elevation: 8,
  },
  suggestionItem: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10,
  },
  suggestionMain: { fontSize: 13, fontWeight: '500' },
  suggestionSub: { fontSize: 11, marginTop: 2 },

  // Form
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  textInputField: {
    borderRadius: 10, borderWidth: 1, height: 44, paddingHorizontal: 14, fontSize: 14,
  },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1, height: 44, paddingHorizontal: 12,
  },
  pickerBtnText: { flex: 1, fontSize: 14 },
  countBtn: {
    width: 40, height: 40, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 12, marginTop: 20,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Driver picker modal
  driverPickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8,
  },
  driverAvatar: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
});
