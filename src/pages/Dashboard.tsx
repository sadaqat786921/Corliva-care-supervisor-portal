import { useNavigate } from 'react-router-dom'
import {
  ClipboardCheck, FileText, ShieldCheck, TriangleAlert, CheckCircle2, ShieldAlert, ClipboardList, Lock, ChevronRight,
} from 'lucide-react'
import { useStore, fmtDate } from '../data/store'
import { TODAY, addDays } from '../data/seed'
import { coverQueue, liveState } from '../data/schedule'
import { planForVisit, plansFor, reviewOverdue } from '../data/clients'
import { serviceFlags } from '../data/review'
import { Button, CardHead, Chip, ChipTone, PageHead, StatTile } from '../components/ui'
import { docExpired } from '../components/CheckActions'
import { reviewNeeded } from './CarePlans'
import { sevTone, stTone } from './Incidents'

const liveTone = (s: string): ChipTone => s === 'Done' ? 'success' : s === 'In progress' ? 'info' : s === 'Late' || s === 'No caregiver' ? 'danger' : s === 'Due soon' ? 'warning' : 'neutral'
const short = (d: string) => d === TODAY ? 'today' : fmtDate(d, { day: 'numeric', month: 'short' })

export default function Dashboard() {
  const s = useStore()
  const nav = useNavigate()
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const first = s.me.name.split(' ')[0]

  const toReview = s.visits.filter(v => s.inBranch(v.branch) && v.approval === 'To review').map(v => ({ v, flags: serviceFlags(v, planForVisit(v, s.carePlans), s.rules.lateArrivalMins) }))
  const flagged = toReview.filter(x => x.flags.length)
  const clientsHere = s.clients.filter(c => s.inBranch(c.branch) && c.status !== 'Discharged').map(c => ({ c, ...plansFor(c.id, s.carePlans) }))
  const plansWaiting = clientsHere.filter(x => x.working?.status === 'Awaiting review')
  const plansReview = clientsHere.filter(x => reviewNeeded(x.current, x.working))
  const incidents = s.incidents.filter(i => s.inBranch(i.branch) && i.owner === s.me.name && !['Resolved', 'Closed'].includes(i.status))
  const newInc = incidents.filter(i => i.status === 'Reported')
  const pastTarget = incidents.filter(i => i.status !== 'Reported' && i.due < TODAY)
  const docs = s.documents.filter(d => s.inBranch(s.client(d.clientId)?.branch ?? '') && (d.status === 'Not checked' || docExpired(d)))
  const cks = s.checks.filter(k => s.inBranch(s.caregiver(k.caregiverId)?.branch ?? '') && ['To do', 'Waiting for check', 'Expired'].includes(k.status))
  const decisions = coverQueue(s.visits, s.caregivers, s.inBranch).filter(i => (i.kind === 'Caregiver not ready' || i.kind === 'Needs review') && !i.visit.override && i.visit.date <= addDays(7))
  const today = s.visits.filter(v => s.inBranch(v.branch) && v.date === TODAY && v.status !== 'Cancelled').sort((a, b) => a.start.localeCompare(b.start))
  const late = today.filter(v => liveState(v) === 'Late')

  type Q = { icon: typeof TriangleAlert; tone: ChipTone; title: string; sub: string; chip: string; action: string; to: string }
  const queue: Q[] = [
    ...newInc.map(i => ({ icon: i.sensitive ? Lock : TriangleAlert, tone: sevTone(i.severity), title: `New incident: ${i.title}`, sub: `${i.client} · reported by ${i.reportedBy} ${short(i.date)}${i.sensitive ? ' · private' : ''}`, chip: `${i.severity} severity`, action: 'Open', to: `/incidents/${i.id}?from=/` })),
    ...decisions.map(d => ({ icon: ShieldAlert, tone: 'danger' as const, title: `Visit needs a decision: ${s.client(d.visit.clientId)?.name}`, sub: `${d.visit.date === TODAY ? 'Today' : fmtDate(d.visit.date)} ${d.visit.start}–${d.visit.end} · ${d.detail}`, chip: 'Only you can make an exception', action: 'Decide', to: `/visits/${d.visit.id}?from=/` })),
    ...pastTarget.map(i => ({ icon: TriangleAlert, tone: 'danger' as const, title: `Incident past its target date: ${i.title}`, sub: `${i.client} · target was ${short(i.due)}`, chip: i.status, action: 'Open', to: `/incidents/${i.id}?from=/` })),
    ...plansWaiting.map(x => ({ icon: FileText, tone: 'info' as const, title: `Care plan to approve: ${x.c.name}`, sub: `Version ${x.working!.version} from ${x.working!.createdBy}${x.current ? '' : ' · first plan, visits can’t start yet'}`, chip: 'Waiting for you', action: 'Review', to: `/care-plans/${x.working!.id}?from=/` })),
    ...(flagged.length ? [{ icon: ClipboardCheck, tone: 'warning' as const, title: `${flagged.length} finished visit${flagged.length > 1 ? 's have' : ' has'} something to look at`, sub: Array.from(new Set(flagged.flatMap(x => x.flags.map(f => f.title.toLowerCase())))).join(', '), chip: 'Visit approvals', action: 'Review', to: '/approvals' }] : []),
    ...plansReview.filter(x => reviewOverdue(x.current)).map(x => ({ icon: ClipboardList, tone: 'danger' as const, title: `Care plan review overdue: ${x.c.name}`, sub: `Was due ${short(x.current!.reviewDate)}`, chip: 'Review overdue', action: 'Record review', to: `/care-plans/${x.current!.id}?from=/` })),
    ...(cks.length ? [{ icon: ShieldCheck, tone: 'warning' as const, title: `${cks.length} caregiver check${cks.length > 1 ? 's' : ''} to do`, sub: cks.map(k => `${s.caregiver(k.caregiverId)?.name}: ${k.name.toLowerCase()}`).slice(0, 2).join(' · ') + (cks.length > 2 ? ' …' : ''), chip: 'Checks', action: 'Open', to: '/checks?tab=caregivers' }] : []),
    ...(docs.length ? [{ icon: FileText, tone: 'warning' as const, title: `${docs.length} client document${docs.length > 1 ? 's' : ''} to check`, sub: docs.map(d => `${s.client(d.clientId)?.name}: ${d.category.toLowerCase()}`).slice(0, 2).join(' · ') + (docs.length > 2 ? ' …' : ''), chip: 'Checks', action: 'Open', to: '/checks' }] : []),
  ]

  return (
    <>
      <PageHead title="My work" crumb="My work" />

      <section className="hero">
        <div className="t-display" style={{ fontSize: 24 }}>{greet}, {first}</div>
        <div style={{ opacity: .92, marginTop: 4 }}>Here is what needs your decision in {s.branchName(s.branch)}.</div>
        {newInc.length > 0 ? <button className="hero-note" onClick={() => nav(`/incidents/${newInc[0].id}?from=/`)}><TriangleAlert size={15} />{newInc.length} new incident{newInc.length > 1 ? 's' : ''} to look at.</button>
          : decisions.length > 0 ? <button className="hero-note" onClick={() => nav(`/visits/${decisions[0].visit.id}?from=/`)}><ShieldAlert size={15} />{decisions.length} visit{decisions.length > 1 ? 's need' : ' needs'} your decision.</button>
            : <span className="hero-note"><CheckCircle2 size={15} />No urgent decisions waiting.</span>}
        <img src="./images/corliva-symbol-light.svg" alt="" aria-hidden />
      </section>

      <div className="grid g-4">
        <StatTile icon={ClipboardCheck} tone="warning" label="Visits to review" value={toReview.length} foot={`${flagged.length} with something to look at`} chip={toReview.length ? { tone: 'warning', text: 'Approve' } : { tone: 'success', text: 'All done' }} onClick={() => nav('/approvals')} />
        <StatTile icon={FileText} tone="info" label="Care plans waiting" value={plansWaiting.length} foot={`${plansReview.length} review${plansReview.length === 1 ? '' : 's'} due soon`} chip={plansWaiting.length ? { tone: 'info', text: 'Review' } : { tone: 'success', text: 'All done' }} onClick={() => nav('/care-plans')} />
        <StatTile icon={TriangleAlert} tone="danger" label="My open incidents" value={incidents.length} foot={`${newInc.length} new · ${pastTarget.length} past target date`} chip={newInc.length ? { tone: 'danger', text: 'New' } : undefined} onClick={() => nav('/incidents')} />
        <StatTile icon={ShieldCheck} tone="success" label="Checks to do" value={docs.length + cks.length} foot={`${docs.length} client documents · ${cks.length} caregiver checks`} onClick={() => nav('/checks')} />
      </div>

      <div className="grid g-main-side" style={{ alignItems: 'start' }}>
        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <CardHead title="Needs you now" sub="Most urgent first. Each item stays here until it’s sorted." />
            <div className="card-body">
              {queue.length === 0 ? <div className="row t-small" style={{ gap: 8 }}><CheckCircle2 size={16} color="var(--status-success)" />You’re all caught up.</div> : queue.map((q, i) => (
                <div key={i} className="list-row">
                  <div className={`stat-icon tone-${q.tone}`} style={{ width: 34, height: 34 }}><q.icon size={16} /></div>
                  <div className="grow"><div className="t-medium">{q.title}</div><div className="t-caption t-muted">{q.sub}</div></div>
                  <Chip tone={q.tone}>{q.chip}</Chip>
                  <Button size="sm" onClick={() => nav(q.to)}>{q.action}</Button>
                </div>))}
            </div>
          </div>

          <div className="card">
            <CardHead title="Finished visits to review" sub="Oldest first. Open one to compare it with the plan." action={<button className="link-btn" onClick={() => nav('/approvals')}>Open Visit approvals</button>} />
            <div className="table-wrap"><table className="tbl">
              <thead><tr><th>Visit</th><th>Caregiver</th><th>Planned</th><th>Recorded</th><th>To look at</th><th style={{ width: 30 }} /></tr></thead>
              <tbody>{toReview.slice().sort((a, b) => (a.v.date + a.v.start).localeCompare(b.v.date + b.v.start)).slice(0, 6).map(({ v, flags }) => (
                <tr key={v.id} className="clickable" onClick={() => nav(`/visits/${v.id}?from=/`)}>
                  <td><div className="t-medium">{s.client(v.clientId)?.name}</div><div className="t-caption t-muted">{v.date === TODAY ? 'Today' : fmtDate(v.date)}</div></td>
                  <td>{s.caregiver(v.caregiverId)?.name}</td><td>{v.start}–{v.end}</td><td>{v.checkIn}–{v.checkOut ?? <span style={{ color: 'var(--status-danger)' }}>none</span>}</td>
                  <td>{flags.length ? <Chip tone={flags.some(f => f.tone === 'danger') ? 'danger' : 'warning'}>{flags.map(f => f.title).join(', ')}</Chip> : <Chip tone="success">Matches the plan</Chip>}</td>
                  <td><ChevronRight size={16} color="var(--text-muted)" /></td>
                </tr>))}
                {toReview.length === 0 && <tr><td colSpan={6} className="t-muted">Nothing to review.</td></tr>}</tbody>
            </table></div>
          </div>
        </div>

        <div className="col" style={{ gap: 16 }}>
          <div className="card">
            <CardHead title="Today’s visits" action={<button className="link-btn" onClick={() => nav('/today')}>Open</button>} />
            <div className="card-body col" style={{ gap: 8 }}>
              {(['Late', 'No caregiver', 'In progress', 'Due soon', 'Later today', 'Done'] as const).map(st => { const n = today.filter(v => liveState(v) === st).length; return (
                <div key={st} className="row between"><Chip tone={liveTone(st)}>{st}</Chip><b>{n}</b></div>) })}
              {late.length > 0 && <div className="hint">Coordinators follow up late check-ins. You’ll see them here too.</div>}
            </div>
          </div>
          <div className="card">
            <CardHead title="My incidents" action={<button className="link-btn" onClick={() => nav('/incidents')}>Open incidents</button>} />
            <div className="card-body">
              {incidents.length === 0 ? <div className="t-small t-muted">No open incidents.</div> : incidents.map(i => (
                <button key={i.id} className="list-row clickable-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/incidents/${i.id}?from=/`)}>
                  {i.sensitive ? <Lock size={15} color="var(--text-muted)" /> : <TriangleAlert size={15} color="var(--text-muted)" />}
                  <div className="grow"><div className="t-small t-medium">{i.title}</div><div className="t-caption t-muted">{i.client} · target {short(i.due)}</div></div>
                  <Chip tone={stTone(i.status)}>{i.status}</Chip>
                </button>))}
            </div>
          </div>
          <div className="card">
            <CardHead title="Care plan reviews coming up" sub="Next 2 weeks." />
            <div className="card-body">
              {plansReview.length === 0 ? <div className="t-small t-muted">No reviews due soon.</div> : plansReview.map(x => (
                <button key={x.c.id} className="list-row clickable-row" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/care-plans/${x.current!.id}?from=/`)}>
                  <ClipboardList size={15} color="var(--text-muted)" /><span className="grow t-small t-medium">{x.c.name}</span>
                  <Chip tone={reviewOverdue(x.current) ? 'danger' : 'warning'}>{reviewOverdue(x.current) ? 'Overdue' : `Due ${short(x.current!.reviewDate)}`}</Chip>
                </button>))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
