package dev.lyvt.melodify.ui

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.lyvt.melodify.data.Track

/** Scrollable categories keep the player separate from library navigation. */
@Composable
fun LibraryTabs(selected: String, onSelect: (String) -> Unit) {
    Row(
        Modifier.fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 12.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        listOf("Startseite", "Favoriten", "Playlists", "Songs", "Alben", "Künstler").forEach { label
            ->
            val active = label == selected
            val bringIntoView = remember { BringIntoViewRequester() }
            LaunchedEffect(active) { if (active) bringIntoView.bringIntoView() }
            Text(
                label,
                Modifier.bringIntoViewRequester(bringIntoView)
                    .clip(RoundedCornerShape(16.dp))
                    .clickable(role = Role.Tab) { onSelect(label) }
                    .semantics { this.selected = active }
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                fontSize = 20.sp,
                fontWeight = if (active) FontWeight.Bold else FontWeight.Normal,
                color =
                    if (active) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
fun CollectionTile(
    title: String,
    tracks: List<Track>,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Column(
        modifier
            .clip(RoundedCornerShape(20.dp))
            .clickable(onClick = onClick)
            .padding(bottom = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Cover(tracks.firstOrNull(), Modifier.fillMaxWidth().aspectRatio(1f))
        Text(
            title,
            Modifier.padding(top = 10.dp, start = 4.dp, end = 4.dp),
            style = MaterialTheme.typography.titleSmall,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            "${tracks.size} Titel",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
fun FloatingMiniPlayer(
    state: PlaybackUi,
    track: Track?,
    onOpen: () -> Unit,
    onToggle: () -> Unit,
    onPrevious: () -> Unit,
    onNext: () -> Unit,
    onQueue: () -> Unit,
) {
    Surface(
        onClick = onOpen,
        shape = RoundedCornerShape(40.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
        modifier =
            Modifier.fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 8.dp, vertical = 8.dp),
    ) {
        Column {
            Row(
                Modifier.fillMaxWidth()
                    .padding(start = 10.dp, end = 6.dp, top = 8.dp, bottom = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Cover(track, Modifier.size(44.dp).clip(CircleShape))
                Column(Modifier.weight(1f).padding(horizontal = 10.dp)) {
                    Text(
                        state.current?.mediaMetadata?.title?.toString().orEmpty(),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        state.current?.mediaMetadata?.artist?.toString().orEmpty(),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                IconButton(onClick = onPrevious) {
                    Icon(Icons.Rounded.SkipPrevious, "Vorheriger Titel")
                }
                IconButton(onClick = onToggle) {
                    Icon(
                        if (state.playing) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                        if (state.playing) "Pause" else "Abspielen",
                    )
                }
                IconButton(onClick = onNext) { Icon(Icons.Rounded.SkipNext, "Nächster Titel") }
                IconButton(onClick = onQueue) {
                    Icon(Icons.Rounded.QueueMusic, "Warteschlange öffnen")
                }
            }
            LinearProgressIndicator(
                progress = {
                    if (state.duration > 0)
                        (state.position.toFloat() / state.duration).coerceIn(0f, 1f)
                    else 0f
                },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 32.dp).height(2.dp),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant,
            )
            Spacer(Modifier.height(4.dp))
        }
    }
}
