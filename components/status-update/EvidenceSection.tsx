import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";

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
                <Image source={{ uri: photoUri }} style={styles.photoPreviewHalf} />
                <TouchableOpacity style={styles.removePhotoButton} onPress={removePhoto}>
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePlaceholderContainer}>
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderIcon}>📷</Text>
                  <Text style={styles.placeholderText}>No image selected</Text>
                </View>
                <TouchableOpacity style={styles.placeholderButton} onPress={takePhoto}>
                  <Text style={styles.placeholderButtonText}>
                    📷 Foto {requiresCameraPhoto ? "(*)" : ""}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.imageHalfContainer}>
            <Text style={styles.imageTypeLabel}>Imagen de galería:</Text>
            {imageUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.photoPreviewHalf} />
                <TouchableOpacity style={styles.removePhotoButton} onPress={removeImage}>
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePlaceholderContainer}>
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.placeholderIcon}>🖼️</Text>
                  <Text style={styles.placeholderText}>No image selected</Text>
                </View>
                <TouchableOpacity
                  style={styles.placeholderButton}
                  onPress={selectImageFromGallery}
                >
                  <Text style={styles.placeholderButtonText}>
                    🖼️ Imagen {requiresGalleryImage ? "(*)" : ""}
                  </Text>
                </TouchableOpacity>
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
                    <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                    <TouchableOpacity style={styles.removePhotoButton} onPress={removePhoto}>
                      <Text style={styles.removePhotoText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                  <Text style={styles.photoButtonText}>
                    📷 Foto {requiresCameraPhoto ? "(obligatorio)" : "(opcional)"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {requiresGalleryImage && (
            <View style={styles.singleImageContainer}>
              {imageUri ? (
                <View>
                  <Text style={styles.imageTypeLabel}>Imagen de galería:</Text>
                  <View style={styles.photoPreviewContainer}>
                    <Image source={{ uri: imageUri }} style={styles.photoPreview} />
                    <TouchableOpacity style={styles.removePhotoButton} onPress={removeImage}>
                      <Text style={styles.removePhotoText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.photoButton}
                  onPress={selectImageFromGallery}
                >
                  <Text style={styles.photoButtonText}>
                    🖼️ Imagen {requiresGalleryImage ? "(obligatorio)" : "(opcional)"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}
