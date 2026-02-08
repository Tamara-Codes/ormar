import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader, TrendingUp, Package, DollarSign, Calendar } from 'lucide-react'
import { getPublications, getItems } from '../lib/api'
import { getSales } from '../lib/sales'
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '../components/ui/chart'
import type { Publication } from '../types'
import type { Sale } from '../lib/sales'

type TimeScale = 'week' | 'month' | 'year'

export function AnalyticsPage() {
  const navigate = useNavigate()
  const [publications, setPublications] = useState<Publication[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterPage, setFilterPage] = useState<string>('all')
  const [timeScale, setTimeScale] = useState<TimeScale>('week')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pubs, , allSales] = await Promise.all([
          getPublications(),
          getItems(),
          getSales(),
        ])
        setPublications(pubs)
        setSales(allSales)
      } catch (err) {
        console.error('Failed to load data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Get unique page names for filter
  const pageNames = Array.from(new Set(publications.map(p => p.fb_page_name)))

  // Filter publications
  const filteredPublications = filterPage === 'all'
    ? publications
    : publications.filter(p => p.fb_page_name === filterPage)

  // Stats
  const totalPublications = publications.length

  // Sales stats
  const totalSales = sales.length
  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.price), 0)
  const averagePrice = totalSales > 0 ? totalRevenue / totalSales : 0

  const thisMonthSales = sales.filter(s => {
    const saleDate = new Date(s.sold_at)
    const now = new Date()
    return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear()
  }).length

  const thisMonthRevenue = sales
    .filter(s => {
      const saleDate = new Date(s.sold_at)
      const now = new Date()
      return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear()
    })
    .reduce((sum, sale) => sum + Number(sale.price), 0)

  // Best selling categories
  const categoryCount = sales.reduce((acc, sale) => {
    acc[sale.category] = (acc[sale.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const bestCategories = Object.entries(categoryCount)
    .sort(([, a], [, b]) => b - a)

  // Best selling brands
  const brandCount = sales.reduce((acc, sale) => {
    if (sale.brand) {
      acc[sale.brand] = (acc[sale.brand] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)
  
  const bestBrands = Object.entries(brandCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  // Chart colors
  const COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b']

  // Category name mapping
  const categoryNames: Record<string, string> = {
    odjeca: 'Odjeća',
    obuca: 'Obuća',
    oprema: 'Oprema',
    igracke: 'Igračke'
  }

  // Prepare chart data for categories
  const categoryChartData = bestCategories.map(([category, count], index) => ({
    name: categoryNames[category] || category,
    value: count,
    fill: COLORS[index % COLORS.length]
  }))

  // Chart config for categories
  const categoryChartConfig = bestCategories.reduce((acc, [category], index) => {
    const displayName = categoryNames[category] || category
    acc[displayName] = {
      label: displayName,
      color: COLORS[index % COLORS.length]
    }
    return acc
  }, {} as Record<string, { label: string; color: string }>)

  // Prepare time-based data based on selected scale
  const getTimeScaleData = () => {
    if (timeScale === 'week') {
      // Last 4 weeks
      const data = []
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - (i * 7))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 7)
        
        const periodSales = sales.filter(s => {
          const saleDate = new Date(s.sold_at)
          return saleDate >= weekStart && saleDate < weekEnd
        })
        
        const periodRevenue = periodSales.reduce((sum, sale) => sum + Number(sale.price), 0)
        
        data.push({
          name: i === 0 ? 'Ovaj tjedan' : `${i}T prije`,
          prodano: periodSales.length,
          zarada: Number(periodRevenue.toFixed(0))
        })
      }
      return data
    } else if (timeScale === 'month') {
      // Last 6 months
      const data = []
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date()
        monthStart.setMonth(monthStart.getMonth() - i)
        monthStart.setDate(1)
        const monthEnd = new Date(monthStart)
        monthEnd.setMonth(monthEnd.getMonth() + 1)
        
        const periodSales = sales.filter(s => {
          const saleDate = new Date(s.sold_at)
          return saleDate >= monthStart && saleDate < monthEnd
        })
        
        const periodRevenue = periodSales.reduce((sum, sale) => sum + Number(sale.price), 0)
        
        const monthNames = ['Sij', 'Velj', 'Ožu', 'Tra', 'Svi', 'Lip', 'Srp', 'Kol', 'Ruj', 'Lis', 'Stu', 'Pro']
        
        data.push({
          name: i === 0 ? 'Ovaj mj.' : monthNames[monthStart.getMonth()],
          prodano: periodSales.length,
          zarada: Number(periodRevenue.toFixed(0))
        })
      }
      return data
    } else {
      // Last 3 years
      const data = []
      const currentYear = new Date().getFullYear()
      for (let i = 2; i >= 0; i--) {
        const year = currentYear - i
        const yearStart = new Date(year, 0, 1)
        const yearEnd = new Date(year + 1, 0, 1)
        
        const periodSales = sales.filter(s => {
          const saleDate = new Date(s.sold_at)
          return saleDate >= yearStart && saleDate < yearEnd
        })
        
        const periodRevenue = periodSales.reduce((sum, sale) => sum + Number(sale.price), 0)
        
        data.push({
          name: i === 0 ? 'Ova god.' : String(year),
          prodano: periodSales.length,
          zarada: Number(periodRevenue.toFixed(0))
        })
      }
      return data
    }
  }

  const timeScaleData = getTimeScaleData()

  return (
    <div className="min-h-screen bg-background pb-8">
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">Analitika</h1>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardHeader className="p-3 pb-2">
                  <CardDescription className="text-xs text-primary font-medium">Ukupna zarada</CardDescription>
                  <CardTitle className="text-2xl">{totalRevenue.toFixed(0)}€</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <DollarSign className="w-3 h-3 mr-1" />
                    {totalSales} prodaja
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-3 pb-2">
                  <CardDescription className="text-xs text-primary font-medium">Prosječna cijena</CardDescription>
                  <CardTitle className="text-2xl">{averagePrice.toFixed(0)}€</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    po artiklu
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-3 pb-2">
                  <CardDescription className="text-xs text-primary font-medium">Objave</CardDescription>
                  <CardTitle className="text-2xl">{totalPublications}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Package className="w-3 h-3 mr-1" />
                    ukupno
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-3 pb-2">
                  <CardDescription className="text-xs text-primary font-medium">Ovaj mjesec</CardDescription>
                  <CardTitle className="text-2xl">{thisMonthRevenue.toFixed(0)}€</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 mr-1" />
                    {thisMonthSales} prodaja
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Trend */}
            {timeScaleData.length > 0 && (
              <Card>
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm mb-2">Trend prodaje</CardTitle>
                  <div className="flex gap-1 p-1 bg-muted rounded-lg">
                    <button
                      onClick={() => setTimeScale('week')}
                      className={`flex-1 text-xs py-1.5 px-2 rounded transition-all ${
                        timeScale === 'week'
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Tjedni
                    </button>
                    <button
                      onClick={() => setTimeScale('month')}
                      className={`flex-1 text-xs py-1.5 px-2 rounded transition-all ${
                        timeScale === 'month'
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Mjeseci
                    </button>
                    <button
                      onClick={() => setTimeScale('year')}
                      className={`flex-1 text-xs py-1.5 px-2 rounded transition-all ${
                        timeScale === 'year'
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Godine
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-2">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={timeScaleData}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ fontSize: '12px' }}
                        labelStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="prodano" fill="#ec4899" name="Prodano" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="zarada" fill="#10b981" name="Zarada (€)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Categories Distribution */}
            {categoryChartData.length > 0 && (
              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">Prodaja po kategorijama</CardTitle>
                  <CardDescription className="text-xs">{totalSales} prodanih artikala</CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <ChartContainer config={categoryChartConfig} className="h-[280px] w-full">
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelKey="name"
                            nameKey="name"
                            formatter={(value, name) => (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{name}:</span>
                                <span className="font-bold">{value} ({((Number(value) / totalSales) * 100).toFixed(0)}%)</span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Pie
                        data={categoryChartData}
                        cx="30%"
                        cy="50%"
                        outerRadius={85}
                        innerRadius={45}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartLegend
                        content={
                          <ChartLegendContent 
                            nameKey="name"
                            layout="vertical"
                            className="text-sm"
                            formatter={(value) => {
                              const item = categoryChartData.find(d => d.name === value)
                              const percentage = item ? ((item.value / totalSales) * 100).toFixed(0) : '0'
                              return `${value} ${percentage}%`
                            }}
                          />
                        }
                        verticalAlign="middle"
                        align="right"
                        layout="vertical"
                      />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}

            {/* Top Brands */}
            {bestBrands.length > 0 && (
              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">Najprodavaniji brendovi</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  {bestBrands.map(([brand, count], index) => (
                    <div key={brand} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-xs font-medium">{brand}</span>
                      </div>
                      <span className="text-xs font-bold text-primary">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Recent Sales */}
            {sales.length > 0 && (
              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">Nedavne prodaje</CardTitle>
                  <CardDescription className="text-xs">{sales.length} ukupno</CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  {sales.slice(0, 5).map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{sale.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(sale.sold_at).toLocaleDateString('hr-HR', {
                            day: 'numeric',
                            month: 'short'
                          })}
                          {sale.size && ` • ${sale.size}`}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-green-600 dark:text-green-400 ml-2">
                        {Number(sale.price).toFixed(0)}€
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Filter */}
            {pageNames.length > 0 && (
              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">Povijest objava</CardTitle>
                  <div className="mt-2">
                    <Select value={filterPage} onValueChange={setFilterPage}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Sve stranice" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Sve stranice</SelectItem>
                        {pageNames.map((name) => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {filteredPublications.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Nema objava za prikaz
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredPublications.slice(0, 5).map((pub) => (
                        <div
                          key={pub.id}
                          className="border border-border rounded-lg p-2"
                        >
                          <div className="flex items-start gap-2">
                            {pub.collage_url ? (
                              <img
                                src={pub.collage_url}
                                alt="Kolaž"
                                className="w-12 h-12 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                <span className="text-xs text-muted-foreground">
                                  {pub.item_ids.length}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-medium text-primary truncate">
                                  {pub.fb_page_name}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(pub.published_at).toLocaleDateString('hr-HR', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
