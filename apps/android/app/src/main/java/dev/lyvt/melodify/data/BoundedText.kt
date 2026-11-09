package dev.lyvt.melodify.data

/** Read before allocating unbounded input; failed imports never reach a DB transaction. */
fun java.io.Reader.readLimited(maxChars: Int): String {
    val out = StringBuilder()
    val buffer = CharArray(4096)
    while (true) {
        val count = read(buffer)
        if (count < 0) break
        require(out.length + count <= maxChars) { "Die ausgewählte Textdatei ist zu groß." }
        out.append(buffer, 0, count)
    }
    return out.toString()
}
