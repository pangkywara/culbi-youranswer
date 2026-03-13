// useImageDownload.ts
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';

export const downloadImage = async (uri: string) => {
  try {
    const permission = await MediaLibrary.requestPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission denied', 'Please allow photo access.');
      return;
    }

    const fs = FileSystem as typeof FileSystem & {
      cacheDirectory: string | null;
      documentDirectory: string | null;
    };

    const dir = fs.cacheDirectory ?? fs.documentDirectory;

    if (!dir) {
      Alert.alert('Error', 'Storage directory not found.');
      return;
    }

    const fileUri = `${dir}img_${Date.now()}.jpg`;

    const result = await FileSystem.downloadAsync(uri, fileUri);

    if (!result?.uri) {
      throw new Error('Download failed');
    }

    await MediaLibrary.saveToLibraryAsync(result.uri);

    Alert.alert('Saved', 'Image saved to gallery.');
  } catch (err) {
    console.log('DOWNLOAD ERROR:', err);
    Alert.alert('Error', 'Could not save image.');
  }
};