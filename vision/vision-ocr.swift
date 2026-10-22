import AppKit
import Vision

// 用法: vision-ocr <image-path>，stdout 输出 JSON 行
let path = CommandLine.arguments[1]
guard let img = NSImage(contentsOfFile: path),
      let tiff = img.tiffRepresentation,
      let rep = NSBitmapImageRep(data: tiff) else {
  FileHandle.standardError.write("cannot read image\n".data(using: .utf8)!)
  exit(1)
}
let cg = rep.cgImage!
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["zh-Hans", "en-US"]
request.usesLanguageCorrection = false
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try handler.perform([request])
let rows: [[String: Any]] = (request.results ?? []).map { obs in
  let box = obs.boundingBox
  return [
    "text": obs.topCandidates(1)[0].string,
    "confidence": obs.topCandidates(1)[0].confidence,
    // 归一化坐标，y 翻转为左上原点
    "box": [box.minX * Double(cg.width), (1 - box.maxY) * Double(cg.height),
            box.width * Double(cg.width), box.height * Double(cg.height)]
  ]
}
let data = try JSONSerialization.data(withJSONObject: ["width": cg.width, "height": cg.height, "lines": rows])
FileHandle.standardOutput.write(data)
