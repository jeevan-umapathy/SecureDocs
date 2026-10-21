import { formatDate } from '../api';
export default function ActivityList({ activity, system = false }) {
    return <section className="panel">
        <h2>{system ? 'Recent system activity' : 'Your activity'}</h2>
        <p className="muted">Latest {system ? '200' : '100'} events. Events before activity tracking was added cannot be reconstructed.</p>
        {!activity.length ? <p className="empty-state">No activity recorded yet.</p> :
            <div className="table-scroll"><table><thead><tr>{system && <th scope="col">User</th>}<th scope="col">Action</th><th scope="col">File / details</th><th scope="col">Time</th></tr></thead>
                <tbody>{activity.map(item => <tr key={item.id}>
                    {system && <td>{item.actor_name || 'Deleted account'}</td>}
                    <td><span className="badge">{item.action.replaceAll('_', ' ')}</span></td>
                    <td>{item.details.filename || item.details.username || '—'}{item.details.recipient && <small>Recipient: {item.details.recipient}</small>}{item.details.previous_name && <small>Previously: {item.details.previous_name}</small>}</td>
                    <td><time dateTime={item.created_at}>{formatDate(item.created_at)}</time></td>
                </tr>)}</tbody></table></div>}
    </section>;
}

