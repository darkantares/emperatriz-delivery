import React from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from 'expo-image';

type Props = {
  showEvidence: boolean;
  requiresCameraPhoto: boolean;
  requiresGalleryImage: boolean;
  photoUri: string | null;
  imageUri: string | null;
  takePhoto: () => void;
  selectImageFromGallery: () => void;
  removePhoto: () => void;
  removeImage: () => void;
  styles: any;
};

export function EvidenceSection({
  showEvidence,
  requiresCameraPhoto,
  requiresGalleryImage,
  photoUri,
  imageUri,
  takePhoto,
  selectImageFromGallery,
  removePhoto,
  removeImage,
  styles,
}: Props) {
  
  if (!showEvidence) return null;

  const labelSuffix =
    requiresCameraPhoto || requiresGalleryImage ? "(obligatorio)" : "(opcional)";

  return (
    <View style={styles.photoContainer}>
      <Text style={styles.photoLabel}>Evidencia {labelSuffix}:</Text>
      {requiresCameraPhoto && requiresGalleryImage ? (
        <View style={styles.imagesRowContainer}>
          <View style={styles.imageHalfContainer}>
            <Text style={styles.imageTypeLabel}>Foto de cámara:</Text>
            {photoUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: photoUri }} style={styles.photoPreviewHalf} contentFit="cover" />
                <Pressable style={styles.removePhotoButton} onPress={removePhoto}>
                  <Text style={styles.removePhotoText}>✕</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.imagePlaceholderContainer}>
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderIcon}>📷</Text>
                  <Text style={styles.placeholderText}>No image selected</Text>
                </View>
                <Pressable style={styles.placeholderButton} onPress={takePhoto}>
                  <Text style={styles.placeholderButtonText}>
                    📷 Foto {requiresCameraPhoto ? "(*)" : ""}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
          <View style={styles.imageHalfContainer}>
            <Text style={styles.imageTypeLabel}>Imagen de galería:</Text>
            {imageUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.photoPreviewHalf} contentFit="cover" />
                <Pressable style={styles.removePhotoButton} onPress={removeImage}>
                  <Text style={styles.removePhotoText}>✕</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.imagePlaceholderContainer}>
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderIcon}>🖼️</Text>
                  <Text style={styles.placeholderText}>No image selected</Text>
                </View>
                <Pressable
                  style={styles.placeholderButton}
                  onPress={selectImageFromGallery}
                >
                  <Text style={styles.placeholderButtonText}>
                    🖼️ Imagen {requiresGalleryImage ? "(*)" : ""}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      ) : (
        <>
          {requiresCameraPhoto && (
            <View style={styles.singleImageContainer}>
              {photoUri ? (
                <View>
                  <View style={styles.photoPreviewContainer}>
                    <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
                    <Pressable style={styles.removePhotoButton} onPress={removePhoto}>
                      <Text style={styles.removePhotoText}>✕</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable style={styles.photoButton} onPress={takePhoto}>
                  <Text style={styles.photoButtonText}>
                    📷 Foto {requiresCameraPhoto ? "(obligatorio)" : "(opcional)"}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
          {requiresGalleryImage && (
            <View style={styles.singleImageContainer}>
              {imageUri ? (
                <View>
                  <Text style={styles.imageTypeLabel}>Imagen de galería:</Text>
                  <View style={styles.photoPreviewContainer}>
                    <Image source={{ uri: imageUri }} style={styles.photoPreview} contentFit="cover" />
                    <Pressable style={styles.removePhotoButton} onPress={removeImage}>
                      <Text style={styles.removePhotoText}>✕</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={styles.photoButton}
                  onPress={selectImageFromGallery}
                >
                  <Text style={styles.photoButtonText}>
                    🖼️ Imagen {requiresGalleryImage ? "(obligatorio)" : "(opcional)"}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}
