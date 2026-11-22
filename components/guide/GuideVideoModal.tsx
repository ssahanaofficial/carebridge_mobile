import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  Linking,
} from 'react-native';
import {
  X,
  Play,
  Pause,
  Maximize2,
  Subtitles,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Volume2,
  Clock,
  Sparkles,
  HelpCircle,
} from 'lucide-react-native';
import { GUIDE_VIDEO_CONFIG, GuideVideoChapter } from '../../configuration/guideVideo';
import { Colors } from '../../constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GuideVideoModalProps {
  visible: boolean;
  onClose: () => void;
  videoUrl?: string;
}

export function GuideVideoModal({ visible, onClose, videoUrl }: GuideVideoModalProps) {
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [showCaptions, setShowCaptions] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const effectiveVideoUrl = videoUrl || GUIDE_VIDEO_CONFIG.videoUrl;

  const activeChapter: GuideVideoChapter =
    GUIDE_VIDEO_CONFIG.chapters[activeChapterIndex] || GUIDE_VIDEO_CONFIG.chapters[0];

  const handleOpenExternal = () => {
    // Open in native YouTube app or browser for external full-screen
    const cleanUrl = effectiveVideoUrl.replace('/embed/', '/watch?v=').split('?')[0];
    Linking.openURL(cleanUrl).catch(() => {
      Linking.openURL(effectiveVideoUrl);
    });
  };

  const isDirectVideo = effectiveVideoUrl.endsWith('.mp4') || effectiveVideoUrl.endsWith('.webm');

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleCol}>
              <View style={styles.badgeRow}>
                <View style={styles.videoBadge}>
                  <Play size={11} color="#0D9488" fill="#0D9488" />
                  <Text style={styles.videoBadgeText}>CAREBRIDGE GUIDE</Text>
                </View>
                <Text style={styles.durationText}>⏱️ {GUIDE_VIDEO_CONFIG.duration}</Text>
              </View>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {GUIDE_VIDEO_CONFIG.title}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityLabel="Close Guide Video"
            >
              <X size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Video Player Container */}
            <View style={styles.videoWrapper}>
              {Platform.OS === 'web' ? (
                isDirectVideo ? (
                  // @ts-ignore
                  <video
                    key={effectiveVideoUrl}
                    style={styles.webVideoElement}
                    controls
                    playsInline
                    autoPlay
                    src={effectiveVideoUrl}
                  />
                ) : (
                  // @ts-ignore
                  <iframe
                    key={effectiveVideoUrl}
                    src={effectiveVideoUrl}
                    title={GUIDE_VIDEO_CONFIG.title}
                    style={styles.webIframe}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                )
              ) : (
                // Mobile Native Fallback Player Card with Direct Web View & Fullscreen Trigger
                <View style={styles.nativeVideoCard}>
                  <View style={styles.nativeVideoPoster}>
                    <View style={styles.playPulseCircle}>
                      <Play size={36} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 4 }} />
                    </View>
                    <Text style={styles.nativePosterTitle}>{GUIDE_VIDEO_CONFIG.title}</Text>
                    <Text style={styles.nativePosterSub}>
                      Interactive Walkthrough • Full HD 1080p
                    </Text>

                    <TouchableOpacity
                      style={styles.nativeWatchBtn}
                      onPress={handleOpenExternal}
                      activeOpacity={0.85}
                    >
                      <Maximize2 size={16} color="#FFFFFF" />
                      <Text style={styles.nativeWatchBtnText}>Play in Fullscreen Player</Text>
                      <ExternalLink size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Quick Controls Bar */}
            <View style={styles.controlsBar}>
              <TouchableOpacity
                style={[styles.controlPill, showCaptions ? styles.controlPillActive : null]}
                onPress={() => setShowCaptions(!showCaptions)}
                activeOpacity={0.7}
              >
                <Subtitles size={14} color={showCaptions ? '#0D9488' : '#64748B'} />
                <Text style={[styles.controlPillText, showCaptions ? styles.controlPillTextActive : null]}>
                  {showCaptions ? 'Captions: On' : 'Captions: Off'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlPill}
                onPress={handleOpenExternal}
                activeOpacity={0.7}
              >
                <Maximize2 size={14} color="#64748B" />
                <Text style={styles.controlPillText}>Full Screen</Text>
                <ExternalLink size={12} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Active Captions Display Box */}
            {showCaptions && (
              <View style={styles.captionsBox}>
                <View style={styles.captionsHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Subtitles size={14} color="#0D9488" />
                    <Text style={styles.captionsHeaderTitle}>
                      Stage {activeChapter.id}: {activeChapter.title}
                    </Text>
                  </View>
                  <Text style={styles.captionTimestamp}>{activeChapter.timestamp}</Text>
                </View>
                <Text style={styles.captionSummaryText}>{activeChapter.summary}</Text>
              </View>
            )}

            {/* Step-by-Step Chapters & Text Instructions */}
            <View style={styles.chaptersSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={18} color="#0D9488" />
                  <Text style={styles.sectionHeading}>Step-by-Step Guide Instructions</Text>
                </View>
                <Text style={styles.stepCounterText}>
                  Step {activeChapterIndex + 1} of {GUIDE_VIDEO_CONFIG.chapters.length}
                </Text>
              </View>

              <Text style={styles.chaptersIntro}>
                Tap any chapter below to explore detailed instructions for each stage of emergency coordination:
              </Text>

              {/* Horizontal / Wrapped Chapter Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chapterChipsScroll}
              >
                {GUIDE_VIDEO_CONFIG.chapters.map((ch, idx) => {
                  const isActive = idx === activeChapterIndex;
                  return (
                    <TouchableOpacity
                      key={ch.id}
                      style={[styles.chapterChip, isActive ? styles.chapterChipActive : null]}
                      onPress={() => setActiveChapterIndex(idx)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.chapterNumberCircle, isActive ? styles.chapterNumberCircleActive : null]}>
                        <Text style={[styles.chapterNumberText, isActive ? styles.chapterNumberTextActive : null]}>
                          {ch.id}
                        </Text>
                      </View>
                      <Text style={[styles.chapterChipText, isActive ? styles.chapterChipTextActive : null]}>
                        {ch.title}
                      </Text>
                      <Text style={[styles.chipTime, isActive ? styles.chipTimeActive : null]}>
                        {ch.timestamp}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Active Chapter Details Card */}
              <View style={styles.activeChapterCard}>
                <View style={styles.activeChapterHeader}>
                  <View style={styles.stepIndicatorBadge}>
                    <Text style={styles.stepIndicatorText}>STEP {activeChapter.id}</Text>
                  </View>
                  <Text style={styles.activeChapterTime}>Starts at {activeChapter.timestamp}</Text>
                </View>

                <Text style={styles.activeChapterTitle}>{activeChapter.title}</Text>
                <Text style={styles.activeChapterSummary}>{activeChapter.summary}</Text>

                <View style={styles.instructionsList}>
                  {activeChapter.instructions.map((inst, i) => (
                    <View key={i} style={styles.instructionItem}>
                      <CheckCircle2 size={16} color="#0D9488" style={{ marginTop: 2 }} />
                      <Text style={styles.instructionText}>{inst}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Need More Assistance Banner */}
            <View style={styles.helpBanner}>
              <View style={styles.helpBannerIconCircle}>
                <HelpCircle size={20} color="#0D9488" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.helpBannerTitle}>24/7 Central Dispatch Assistance</Text>
                <Text style={styles.helpBannerDesc}>
                  Need immediate help creating an emergency case? Dial 108 or contact central coordination.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 10,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 780,
    maxHeight: '94%',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  modalHeaderTitleCol: {
    flex: 1,
    marginRight: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.3)',
  },
  videoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2DD4BF',
    letterSpacing: 0.6,
  },
  durationText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
    position: 'relative',
  },
  webIframe: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
  },
  webVideoElement: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  nativeVideoCard: {
    width: '100%',
    height: '100%',
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeVideoPoster: {
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  playPulseCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#0D9488',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  nativePosterTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
  },
  nativePosterSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 10,
  },
  nativeWatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D9488',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  nativeWatchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  controlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  controlPillActive: {
    backgroundColor: 'rgba(13, 148, 136, 0.2)',
    borderColor: '#0D9488',
  },
  controlPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  controlPillTextActive: {
    color: '#2DD4BF',
    fontWeight: '700',
  },
  captionsBox: {
    margin: 14,
    marginBottom: 0,
    padding: 12,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0D9488',
  },
  captionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  captionsHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2DD4BF',
  },
  captionTimestamp: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  captionSummaryText: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  chaptersSection: {
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  stepCounterText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  chaptersIntro: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
    lineHeight: 17,
  },
  chapterChipsScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  chapterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chapterChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#14B8A6',
  },
  chapterNumberCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterNumberCircleActive: {
    backgroundColor: '#FFFFFF',
  },
  chapterNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  chapterNumberTextActive: {
    color: '#0D9488',
  },
  chapterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  chapterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipTime: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  chipTimeActive: {
    color: '#CCFBF1',
  },
  activeChapterCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 4,
  },
  activeChapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepIndicatorBadge: {
    backgroundColor: 'rgba(13, 148, 136, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepIndicatorText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2DD4BF',
    letterSpacing: 0.6,
  },
  activeChapterTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  activeChapterTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  activeChapterSummary: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 12,
  },
  instructionsList: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 19,
  },
  helpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 16,
    marginTop: 4,
    padding: 14,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.25)',
  },
  helpBannerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(13, 148, 136, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2DD4BF',
  },
  helpBannerDesc: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 16,
  },
});
