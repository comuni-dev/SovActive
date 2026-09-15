/* =================================
   CLOUDINARY UPLOAD HELPER
================================= */

const CLOUDINARY_CONFIG = {
    cloudName: "feyl2swx",
    uploadPreset: "SovActive", // tu preset unsigned
    folder: "sovactive/publicaciones"
};

/**
 * Sube un archivo (imagen o video) a Cloudinary (unsigned)
 * @param {File} file
 * @param {Function} onProgress - callback (0-100)
 * @returns {Promise<{url, publicId, type, resourceType}>}
 */
export async function uploadToCloudinary(file, onProgress) {
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/auto/upload`;

    const isVideo = file.type.startsWith("video/");
    const resourceType = isVideo ? "video" : "image";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);
    formData.append("folder", CLOUDINARY_CONFIG.folder);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", url, true);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && typeof onProgress === "function") {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    resolve({
                        url: data.secure_url,
                        publicId: data.public_id,
                        type: isVideo ? "video" : "image",
                        resourceType: data.resource_type
                    });
                } catch (err) {
                    reject(new Error("Respuesta inválida de Cloudinary"));
                }
            } else {
                try {
                    const err = JSON.parse(xhr.responseText);
                    reject(new Error(err.error?.message || "Error al subir"));
                } catch {
                    reject(new Error("Error al subir el archivo"));
                }
            }
        };

        xhr.onerror = () => reject(new Error("Error de red al subir"));
        xhr.send(formData);
    });
}

/**
 * Elimina un asset de Cloudinary (requiere backend con API secret).
 * Como no lo tenemos, sólo limpiamos la referencia en Firestore.
 */
export function getCloudinaryUrl(publicId, resourceType = "image") {
    return `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload/${publicId}`;
}