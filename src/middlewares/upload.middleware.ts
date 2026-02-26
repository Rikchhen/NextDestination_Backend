import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

// Ensure the uploads directory exists
// __dirname is the directory of the current module
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Made such that test doesnt require dev file path
// test can only access the memory bit
const storage =
  process.env.NODE_ENV === "test"
    ? multer.memoryStorage() // a little conditional statement that decides if its test or dev
    : multer.diskStorage({
        destination: function (req, file, cb) {
          console.log("Multer destination called", file.fieldname);
          //
          // const folderName = req.file?.fieldname; // profile-image // post-image
          const folderName = file.fieldname; //doing this because gpt says req.file is undefined at this point, whatever that means
          const uploadDir = path.join(__dirname, "../../uploads/" + folderName);
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: function (req, file, cb) {
          console.log("Multer filename called", file.originalname);
          const uniqueSuffix = uuidv4();
          const extension = path.extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
        },
      });

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  // Accept images only
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed!"));
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB file size limit
});

export const uploads = {
  single: (fieldName: string) => upload.single(fieldName),
  array: (fieldName: string, maxCount: number) =>
    upload.array(fieldName, maxCount),
  fields: (fieldsArray: { name: string; maxCount?: number }[]) =>
    upload.fields(fieldsArray),
};
