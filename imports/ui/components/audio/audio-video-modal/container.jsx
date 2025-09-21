import React, { memo, useCallback } from 'react';
import { useReactiveVar } from '@apollo/client';
import { isEqual } from 'radash';
import AudioManager from '/imports/ui/services/audio-manager';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import { useStorageKey } from '/imports/ui/services/storage/hooks';
import AudioError from '/imports/ui/services/audio-manager/error-codes';
import getFromUserSettings from '/imports/ui/services/users-settings';
import Service from '../service';
import {
  joinMicrophone,
  closeModal as closeAudioModal,
  joinListenOnly,
  leaveEchoTest,
} from '../audio-modal/service';
import AudioModalService from '/imports/ui/components/audio/audio-modal/service';
import deviceInfo from '/imports/utils/deviceInfo';
import { getStoredAudioInputDeviceId } from '/imports/api/audio/client/bridge/service';
import { useIsAudioTranscriptionEnabled } from '/imports/ui/components/audio/audio-graphql/audio-captions/service';
import useIsAudioConnected from '/imports/ui/components/audio/audio-graphql/hooks/useIsAudioConnected';
import Component from './component';

const CombinedAudioVideoModalContainer = (props) => {
  const { setIsOpen } = props;
  const { data: meeting } = useMeeting((m) => ({
    voiceSettings: m.voiceSettings,
    audioBridge: m.audioBridge,
  }));
  const { data: currentUserData } = useCurrentUser((user) => ({
    isModerator: user.isModerator,
  }));

  const usingLiveKit = meeting?.audioBridge === 'livekit';
  const getEchoTest = useStorageKey('getEchoTest', 'session');

  const isModerator = currentUserData?.isModerator;
  const APP_CONFIG = window.meetingClientSettings.public.app;
  const forceListenOnly = getFromUserSettings('bbb_force_listen_only', APP_CONFIG.forceListenOnly);
  const listenOnlyMode = forceListenOnly
    || (getFromUserSettings('bbb_listen_only_mode', APP_CONFIG.listenOnlyMode) && !usingLiveKit);
  const skipCheck = getFromUserSettings('bbb_skip_check_audio', APP_CONFIG.skipCheck);
  const skipCheckOnJoin = getFromUserSettings('bbb_skip_check_audio_on_first_join', APP_CONFIG.skipCheckOnJoin);
  const skipEchoTestIfPreviousDevice = getFromUserSettings(
    'bbb_skip_echotest_if_previous_device',
    APP_CONFIG.skipEchoTestIfPreviousDevice,
  ) && !deviceInfo.isMobile;

  const inputDeviceId = useReactiveVar(AudioManager._inputDeviceId.value);
  const outputDeviceId = useReactiveVar(AudioManager._outputDeviceId.value);
  const permissionStatus = useReactiveVar(AudioManager._permissionStatus.value);
  const showPermissionsOvelay = useReactiveVar(AudioManager._isWaitingPermissions.value);
  const isConnecting = useReactiveVar(AudioManager._isConnecting.value);
  const isReconnecting = useReactiveVar(AudioManager._isReconnecting.value);
  const isConnected = useIsAudioConnected();
  const isEchoTest = Service.isEchoTest();
  const isListenOnly = useReactiveVar(AudioManager._isListenOnly.value);
  const isMuted = useReactiveVar(AudioManager._isMuted.value);
  const autoplayBlocked = useReactiveVar(AudioManager._autoplayBlocked.value);
  const isUsingAudio = Service.isUsingAudio();
  const supportsTransparentListenOnly = Service.supportsTransparentListenOnly();

  const devicesAlreadyConfigured = skipEchoTestIfPreviousDevice && !!getStoredAudioInputDeviceId();
  const joinFullAudioImmediately = (Service.inputDeviceId() !== 'listen-only')
    && (skipCheck || (skipCheckOnJoin && !getEchoTest) || devicesAlreadyConfigured);

  const joinMic = useCallback(
    (options = {}) => joinMicrophone({
      skipEchoTest: options.skipEchoTest || joinFullAudioImmediately,
      muted: options.muteOnStart || meeting?.voiceSettings?.muteOnStart,
    }),
    [skipCheck, skipCheckOnJoin, meeting],
  );

  const close = useCallback(() => {
    const handleJoinError = (error, listenOnly) => {
      if (!listenOnly
        && (error.name === 'NotAllowedError' || error.errCode === AudioError.MIC_ERROR.NO_PERMISSION)) {
        joinListenOnly().catch((loError) => handleJoinError(loError, true));
      }
    };

    const callback = () => {
      setIsOpen(false);

      if (usingLiveKit && !isConnected && !isConnecting) {
        joinMic().catch((error) => handleJoinError(error, false));
      }
    };

    closeAudioModal(callback);
  }, [isConnected, isConnecting, usingLiveKit, joinMic, setIsOpen]);

  const isTranscriptionEnabled = useIsAudioTranscriptionEnabled();
  if (!currentUserData) return null;

  return (
    <Component
      inputDeviceId={inputDeviceId}
      outputDeviceId={outputDeviceId}
      permissionStatus={permissionStatus}
      showPermissionsOvelay={showPermissionsOvelay}
      isUsingAudio={isUsingAudio}
      isConnecting={isConnecting}
      isReconnecting={isReconnecting}
      isConnected={isConnected}
      isListenOnly={isListenOnly}
      isEchoTest={isEchoTest}
      isMuted={isMuted}
      autoplayBlocked={autoplayBlocked}
      getEchoTest={getEchoTest}
      joinFullAudioImmediately={joinFullAudioImmediately}
      closeModal={close}
      joinMicrophone={joinMic}
      joinListenOnly={joinListenOnly}
      leaveEchoTest={leaveEchoTest}
      changeInputDevice={Service.changeInputDevice}
      liveChangeInputDevice={Service.liveChangeInputDevice}
      changeInputStream={Service.changeInputStream}
      changeOutputDevice={Service.changeOutputDevice}
      updateInputDevices={Service.updateInputDevices}
      updateOutputDevices={Service.updateOutputDevices}
      joinEchoTest={Service.joinEchoTest}
      exitAudio={Service.exitAudio}
      handleAllowAutoplay={Service.handleAllowAutoplay}
      notify={Service.notify}
      getMicrophonePermissionStatus={Service.getMicrophonePermissionStatus}
      getAudioConstraints={Service.getAudioConstraints}
      doGUM={Service.doGUM}
      bypassGUM={Service.bypassGUM}
      supportsTransparentListenOnly={supportsTransparentListenOnly}
      hasMicrophonePermission={Service.hasMicrophonePermission}
      getTroubleshootingLink={AudioModalService.getTroubleshootingLink}
      listenOnlyMode={listenOnlyMode}
      isTranscriptionEnabled={isTranscriptionEnabled}
      {...props}
    />
  );
};

export default memo(CombinedAudioVideoModalContainer, isEqual);
