import React, { useCallback } from 'react';
import { useMutation } from '@apollo/client';
import Service from './service';
import AudioVideoPreview from './component';
import VideoService from '/imports/ui/components/video-provider/service';
import * as ScreenShareService from '/imports/ui/components/screenshare/service';
import logger from '/imports/startup/client/logger';
import { SCREENSHARING_ERRORS } from '/imports/api/screenshare/client/bridge/errors';
import { EXTERNAL_VIDEO_STOP } from '../external-video-player/mutations';
import {
  useSharedDevices, useHasVideoStream, useHasCapReached, useIsUserLocked, useStreams,
  useExitVideo,
  useStopVideo,
} from '/imports/ui/components/video-provider/hooks';
import { useStorageKey } from '../../services/storage/hooks';
import { useIsCustomVirtualBackgroundsEnabled, useIsVirtualBackgroundsEnabled } from '../../services/features';
import AudioService, {
  CLIENT_DID_USER_SELECT_MICROPHONE_KEY,
  CLIENT_DID_USER_SELECT_LISTEN_ONLY_KEY,
} from '/imports/ui/components/audio/service';
import useSettings  from '../../services/settings/hooks/useSettings';
import useMeeting from '../../core/hooks/useMeeting';
import { SETTINGS } from '/imports/ui/services/settings/enums';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import AudioError from '/imports/ui/services/audio-manager/error-codes';
import { useReactiveVar } from '@apollo/client';
import AudioManager from '/imports/ui/services/audio-manager';
import getFromUserSettings from '/imports/ui/services/users-settings';
import { SET_AWAY } from '/imports/ui/components/user-list/user-list-content/user-participants/user-list-participants/user-actions/mutations';


const AudioVideoPreviewContainer = (props) => {
  const {
    callbackToClose,
    setIsOpen,
  } = props;
  const APP_CONFIG = window.meetingClientSettings.public.app;
  const cameraAsContentDeviceId = ScreenShareService.useCameraAsContentDeviceIdType();
  const userSelectedMicrophone = !!useStorageKey(CLIENT_DID_USER_SELECT_MICROPHONE_KEY, 'session');
  const [stopExternalVideoShare] = useMutation(EXTERNAL_VIDEO_STOP);
  const [setAway] = useMutation(SET_AWAY);
  const streams = useStreams();
  const exitVideo = useExitVideo();
  const stopVideo = useStopVideo();
  const sharedDevices = useSharedDevices();
  const hasVideoStream = useHasVideoStream();
  const camCapReached = useHasCapReached();

  

  const isCamLocked = useIsUserLocked();
  const settingsStorage = window.meetingClientSettings.public.app.userSettingsStorage;
  const webcamDeviceId = useStorageKey('WebcamDeviceId', settingsStorage);
  const isVirtualBackgroundsEnabled = useIsVirtualBackgroundsEnabled();
  const isCustomVirtualBackgroundsEnabled = useIsCustomVirtualBackgroundsEnabled();
  const isCameraAsContentBroadcasting = ScreenShareService.useIsCameraAsContentBroadcasting();
  const permissionStatus = useReactiveVar(AudioManager._permissionStatus.value);

  console.log('@gs1 permissionStatus', AudioManager, permissionStatus);
  const inputDeviceId = useReactiveVar(AudioManager._inputDeviceId.value);
  const outputDeviceId = useReactiveVar(AudioManager._outputDeviceId.value);
  const showPermissionsOvelay = useReactiveVar(AudioManager._isWaitingPermissions.value);
  const { microphoneConstraints } = useSettings(SETTINGS.APPLICATION);
  const skipCheck = getFromUserSettings('bbb_skip_check_audio', APP_CONFIG.skipCheck);
    const skipCheckOnJoin = getFromUserSettings('bbb_skip_check_audio_on_first_join', APP_CONFIG.skipCheckOnJoin);
    
  const { data: meeting } = useMeeting((m) => ({
      audioBridge: m.audioBridge,
      voiceSettings: {
        voiceConf: m?.voiceSettings?.voiceConf,
        muteOnStart: m?.voiceSettings?.muteOnStart,
      },
    }));
    const { data: currentUser } = useCurrentUser((u) => ({
      userId: u.userId,
      name: u.name,
      speechLocale: u.speechLocale,
      breakoutRoomsSummary: u.breakoutRoomsSummary,
    }));

    const {
      defaultFullAudioBridge,
      defaultListenOnlyBridge,
    } = window.meetingClientSettings.public.media || {};
    const bridges = {
      fullAudioBridge: meeting?.audioBridge ?? defaultFullAudioBridge,
      listenOnlyBridge: meeting?.audioBridge ?? defaultListenOnlyBridge,
    };

    const joinMic = useCallback(
        (options = {}) => AudioService.joinMicrophone({
          skipEchoTest: options.skipEchoTest, // || joinFullAudioImmediately,
          muted: false,//options.muteOnStart || meeting?.voiceSettings?.muteOnStart,
        }),
        [skipCheck, skipCheckOnJoin, meeting],
      );


    // const init = async () => {
    //   await AudioService.init(
    //     messages,
    //     intl,
    //     toggleVoice,
    //     currentUser?.speechLocale,
    //     meeting?.voiceSettings?.voiceConf,
    //     currentUser?.name,
    //     bridges,
    //   );
  
    //   // if ((!autoJoin || didMountAutoJoin)) {
    //   //   if (enableVideo && autoShareWebcam) {
    //   //     openVideoPreviewModal();
    //   //   }
    //   //   return Promise.resolve(false);
    //   // }
    //   // Session.setItem('audioModalIsOpen', true);
    //   // if (enableVideo && autoShareWebcam) {
    //   //   openAudioModal();
    //   //   openVideoPreviewModal();
    //   //   didMountAutoJoin = true;
    //   // } else if (!(
    //   //   userSelectedMicrophone
    //   //   && userSelectedListenOnly
    //   //   && meetingIsBreakout)) {
    //   //   openAudioModal();
    //   //   didMountAutoJoin = true;
    //   // }
    //   return Promise.resolve(true);
    // };

  const stopSharing = (deviceId) => {
    callbackToClose();
    setIsOpen(false);
    if (deviceId) {
      const streamId = VideoService.getMyStreamId(deviceId, streams);
      if (streamId) stopVideo(streamId);
    } else {
      exitVideo();
    }
  };

  const startSharingCameraAsContent = (deviceId) => {
    callbackToClose();
    setIsOpen(false);
    const handleFailure = (error) => {
      const {
        errorCode = SCREENSHARING_ERRORS.UNKNOWN_ERROR.errorCode,
        errorMessage = error.message,
      } = error;

      logger.error({
        logCode: 'camera_as_content_failed',
        extraInfo: { errorCode, errorMessage },
      }, `Sharing camera as content failed: ${errorMessage} (code=${errorCode})`);

      ScreenShareService.screenshareHasEnded();
    };
    ScreenShareService.shareScreen(
      isCameraAsContentBroadcasting,
      stopExternalVideoShare,
      true, handleFailure, { stream: Service.getStream(deviceId)._mediaStream },
    );
    ScreenShareService.setCameraAsContentDeviceId(deviceId);
  };

  const startSharing = (deviceId) => {
    callbackToClose();
    setIsOpen(false);
    VideoService.joinVideo(deviceId, isCamLocked);
  };

  const stopSharingCameraAsContent = () => {
    callbackToClose();
    setIsOpen(false);
    ScreenShareService.screenshareHasEnded();
  };

  const closeModal = () => {
    callbackToClose();
    setIsOpen(false);
  };

  

  return (
    <AudioVideoPreview
      {...{
        stopSharingCameraAsContent,
        closeModal,
        startSharing,
        cameraAsContentDeviceId,
        startSharingCameraAsContent,
        stopSharing,
        sharedDevices,
        hasVideoStream,
        camCapReached,
        isCamLocked,
        webcamDeviceId,
        isVirtualBackgroundsEnabled,
        isCustomVirtualBackgroundsEnabled,
        inputDeviceId,
        outputDeviceId,
        showPermissionsOvelay,
        changeInputDevice: AudioService.changeInputDevice,
        changeOutputDevice: AudioService.changeOutputDevice,
        AudioError,
        getMicrophonePermissionStatus: AudioService.getMicrophonePermissionStatus,
        hasMicrophonePermission: AudioService.hasMicrophonePermission,
        permissionStatus,
        checkMicrophonePermission: AudioService.checkMicrophonePermission,
        updateInputDevices: AudioService.updateInputDevices,
        updateOutputDevices: AudioService.updateOutputDevices,
        joinMic,
        joinListenOnly:AudioService.joinListenOnly,
        setAway,
        ...props,
      }}
    />
  );
};

export default AudioVideoPreviewContainer;
