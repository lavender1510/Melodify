package dev.lyvt.melodify.data

data class LyricLine(val timeMs: Long?, val text: String)

fun parseLyrics(text: String): List<LyricLine> {
    val offset =
        Regex("\\[offset:([+-]?\\d+)\\]").find(text)?.groupValues?.get(1)?.toLongOrNull() ?: 0
    val stamp = Regex("\\[(\\d{1,3}):(\\d{2})(?:[.:](\\d{1,3}))?\\]")
    val lines =
        text
            .removePrefix("\uFEFF")
            .lineSequence()
            .flatMap { line ->
                val matches = stamp.findAll(line).toList()
                if (matches.isEmpty()) {
                    if (line.startsWith('[') || line.isBlank()) emptySequence()
                    else sequenceOf(LyricLine(null, line))
                } else
                    matches.asSequence().map { m ->
                        LyricLine(
                            (m.groupValues[1].toLong() * 60000 +
                                    m.groupValues[2].toLong() * 1000 +
                                    m.groupValues[3].padEnd(3, '0').take(3).toLong() +
                                    offset)
                                .coerceAtLeast(0),
                            line.replace(stamp, "").trim(),
                        )
                    }
            }
            .toList()
    return if (lines.any { it.timeMs != null })
        lines.filter { it.timeMs != null }.sortedBy { it.timeMs }
    else lines
}
