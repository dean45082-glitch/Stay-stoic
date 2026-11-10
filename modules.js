(function (w) {
  'use strict';

  const React = w.React;
  if (!React) return;
  const h = React.createElement;
  const { useState, useEffect } = React;

  const COLORS = {
    bg: '#1C1B18',
    bgSoft: '#242320',
    marble: '#EDE6D6',
    marbleDim: '#B8AF9C',
    bronze: '#8A6D3B',
    bronzeLight: '#C9A768',
    gold: '#D9B24C',
    verdigris: '#4A5D52',
    terracotta: '#7A2E2E',
    line: '#3A3730'
  };
  const serif = "Georgia, 'Times New Roman', serif";
  const sans = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";

  const LEGACY_META_KEY = 'staystoic_meta_v4';
  const C1_META_KEY = 'staystoic_c1_meta_v1';
  const C1_PROGRESS_KEY = 'staystoic_c1_progress_v1';
  const AMAZON_META_KEY = 'staystoic_amazon_meta_v1';
  const AMAZON_PROGRESS_KEY = 'staystoic_amazon_progress_v1';
  const RATE_KEY = 'stayStoicSpeechRate';

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error(e); }
  }

  function defaultC1Meta() {
    return { day: 1, streak: 0, lastCompletedDay: 0, completedDays: [] };
  }

  function currentRate() {
    try {
      const n = Number(localStorage.getItem(RATE_KEY));
      return Number.isFinite(n) && n >= 0.6 && n <= 1.4 ? n : 1;
    } catch {
      return 1;
    }
  }

  function setRate(rate) {
    const n = Math.max(0.6, Math.min(1.4, Number(rate) || 1));
    try { localStorage.setItem(RATE_KEY, String(n)); } catch {}
    try { w.StoicAudio?.setRate(n); } catch {}
    try { w.AndroidTTS?.setSpeechRate?.(n); } catch {}
    return n;
  }

  function c1Speak(text, rate, status) {
    const r = rate || currentRate();
    if (!text) return;
    try {
      if (w.StoicAudio?.speak) {
        w.StoicAudio.speak(text, r, status);
        return;
      }
      if (w.AndroidTTS?.speak) {
        w.AndroidTTS.setSpeechRate?.(r);
        w.AndroidTTS.speak(text);
        status?.('Audio nativo de Android.');
        return;
      }
      if (!w.speechSynthesis) {
        status?.('Audio no disponible.');
        return;
      }
      w.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = r;
      u.onend = () => status?.('Audio terminado.');
      u.onerror = () => status?.('No se pudo reproducir el audio.');
      w.speechSynthesis.speak(u);
    } catch {
      status?.('No se pudo reproducir el audio.');
    }
  }

  function pct(done, total) {
    return total ? Math.round((done / total) * 100) : 0;
  }

  const card = {
    background: COLORS.bgSoft,
    border: '1px solid ' + COLORS.line,
    borderRadius: 16,
    padding: '18px 16px',
    marginBottom: 14,
    boxShadow: '0 12px 30px rgba(0,0,0,0.18)'
  };

  const ghost = {
    background: 'transparent',
    border: '1px solid ' + COLORS.line,
    color: COLORS.marbleDim,
    borderRadius: 10,
    padding: '10px 14px',
    minHeight: 42,
    fontSize: 12,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    cursor: 'pointer',
    fontFamily: sans
  };

  function primary(bg) {
    return {
      width: '100%',
      padding: '15px 18px',
      minHeight: 52,
      background: bg || COLORS.bronze,
      color: COLORS.marble,
      border: 'none',
      borderRadius: 12,
      fontSize: 15,
      fontFamily: sans,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      cursor: 'pointer',
      marginTop: 8
    };
  }

  function ProgressLine({ value }) {
    return h('div', {
      style: {
        height: 6,
        background: COLORS.bg,
        borderRadius: 999,
        overflow: 'hidden',
        marginTop: 10
      }
    }, h('div', {
      style: {
        width: Math.max(value ? 3 : 0, value) + '%',
        height: '100%',
        background: COLORS.bronze,
        borderRadius: 999
      }
    }));
  }

  function ModuleCard({ title, subtitle, author, image, done, total, onClick, preparing }) {
    const started = done > 0;
    const value = total ? pct(done, total) : 0;
    return h('div', {
      onClick: preparing ? undefined : onClick,
      style: {
        ...card,
        position: 'relative',
        overflow: 'hidden',
        minHeight: 188,
        cursor: preparing ? 'default' : 'pointer',
        opacity: preparing ? 0.78 : 1,
        background: 'linear-gradient(135deg, #242320 0%, #1C1B18 100%)'
      }
    },
      h('div', { style: { position: 'relative', zIndex: 2, width: '68%' } },
        h('div', {
          style: {
            color: COLORS.bronzeLight,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1.2,
            marginBottom: 8
          }
        }, author),
        h('div', {
          style: {
            color: COLORS.marble,
            fontFamily: serif,
            fontSize: 26,
            lineHeight: 1.08,
            marginBottom: 8
          }
        }, title),
        h('div', {
          style: {
            color: COLORS.marbleDim,
            fontSize: 12,
            lineHeight: 1.5,
            minHeight: 36
          }
        }, subtitle),
        preparing
          ? h('div', {
              style: {
                display: 'inline-block',
                marginTop: 16,
                padding: '8px 11px',
                borderRadius: 999,
                border: '1px solid ' + COLORS.bronze,
                color: COLORS.bronzeLight,
                fontSize: 11,
                fontWeight: 700
              }
            }, 'En preparación')
          : h(React.Fragment, null,
              h(ProgressLine, { value }),
              h('div', {
                style: {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 8,
                  fontSize: 11
                }
              },
                h('span', { style: { color: COLORS.marbleDim } }, done + ' de ' + total + ' días'),
                h('span', { style: { color: COLORS.bronzeLight, fontWeight: 800 } }, started ? 'Continuar ›' : 'Empezar ›')
              )
            )
      ),
      h('div', {
        style: {
          position: 'absolute',
          inset: '0 0 0 auto',
          width: '48%',
          background: 'linear-gradient(90deg, rgba(28,27,24,0) 0%, rgba(28,27,24,.88) 80%)',
          zIndex: 1
        }
      }),
      h('img', {
        src: image,
        alt: author,
        style: {
          position: 'absolute',
          right: -12,
          bottom: -18,
          width: 178,
          height: 178,
          borderRadius: '50%',
          objectFit: 'cover',
          objectPosition: '50% 18%',
          opacity: preparing ? 0.45 : 0.72,
          filter: 'sepia(.2) contrast(1.05)',
          zIndex: 0
        }
      })
    );
  }

  function ModuleHub({ onSelect }) {
    const legacy = readJSON(LEGACY_META_KEY, null);
    const c1 = readJSON(C1_META_KEY, defaultC1Meta());
    const legacyDone = Array.isArray(legacy?.completedDays) ? legacy.completedDays.length : 0;
    const c1Done = Array.isArray(c1?.completedDays) ? c1.completedDays.length : 0;

    return h('div', {
      style: {
        minHeight: '100vh',
        background: COLORS.bg,
        color: COLORS.marble,
        fontFamily: sans
      }
    },
      h('div', {
        style: {
          maxWidth: 520,
          margin: '0 auto',
          padding: '34px 18px 44px'
        }
      },
        h('div', {
          style: {
            textAlign: 'center',
            marginBottom: 26
          }
        },
          h('div', {
            style: {
              color: COLORS.bronzeLight,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: 2,
              marginBottom: 8
            }
          }, 'STAY STOIC'),
          h('div', {
            style: {
              fontFamily: serif,
              fontSize: 34,
              lineHeight: 1.08,
              marginBottom: 8
            }
          }, 'Elige tu camino'),
          h('div', {
            style: {
              color: COLORS.marbleDim,
              fontSize: 13,
              lineHeight: 1.55
            }
          }, 'Tres caminos independientes. Tu progreso se conserva por separado en cada módulo.')
        ),
        h(ModuleCard, {
          title: 'English My Way',
          subtitle: 'Tu curso actual de inglés. Conserva exactamente tu calendario y progreso existentes.',
          author: 'MARCO AURELIO',
          image: 'app-icon.webp',
          done: legacyDone,
          total: 150,
          onClick: () => onSelect('english')
        }),
        h(ModuleCard, {
          title: 'My Way to C1',
          subtitle: 'Inglés general avanzado: matices, inferencia, ritmo natural, reformulación y producción propia.',
          author: 'EPICTETO',
          image: 'epictetus.webp',
          done: c1Done,
          total: w.C1_COURSE?.totalDays || 69,
          onClick: () => onSelect('c1')
        }),
        h(ModuleCard, {
          title: 'My Way Up at Amazon',
          subtitle: 'Inglés operativo y crecimiento dentro de Amazon.',
          author: 'SÉNECA',
          image: 'seneca.webp',
          done: 0,
          total: 0,
          preparing: true
        })
      )
    );
  }

  function ModuleTopBar({ title, onModules }) {
    return h('div', {
      style: {
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(28,27,24,.97)',
        borderBottom: '1px solid ' + COLORS.line,
        backdropFilter: 'blur(8px)'
      }
    },
      h('div', {
        style: {
          maxWidth: 520,
          margin: '0 auto',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10
        }
      },
        h('button', {
          onClick: onModules,
          style: {
            ...ghost,
            minHeight: 36,
            padding: '7px 10px',
            color: COLORS.marble
          }
        }, '‹ Módulos'),
        h('div', {
          style: {
            color: COLORS.bronzeLight,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: .5,
            textAlign: 'right'
          }
        }, title)
      )
    );
  }

  const EPICTETUS_MOMENTS = [
    'Distingue lo que depende de ti y suelta lo demás.',
    'No controles el resultado; controla tu respuesta.',
    'Si quieres mejorar, acepta parecer principiante por un tiempo.',
    'El progreso se nota más en tus reacciones que en tus palabras.',
    'Antes de reaccionar, pregúntate qué parte sí está bajo tu control.',
    'La práctica convierte la filosofía en carácter.',
    'Tu carácter se fortalece cada vez que eliges bien bajo presión.',
    'No necesitas controlar a otros para gobernarte a ti mismo.',
    'La libertad empieza cuando dejas de exigir que todo ocurra a tu manera.'
  ];

  function C1Moment({ day }) {
    const quote = EPICTETUS_MOMENTS[(day - 1) % EPICTETUS_MOMENTS.length];
    return h('div', {
      style: {
        ...card,
        position: 'relative',
        overflow: 'hidden',
        minHeight: 138,
        background: 'linear-gradient(135deg, #242320 0%, #1C1B18 100%)'
      }
    },
      h('div', { style: { position: 'relative', zIndex: 2, width: '68%' } },
        h('div', {
          style: {
            color: COLORS.bronzeLight,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1.1,
            marginBottom: 9
          }
        }, 'MOMENTO ESTOICO'),
        h('div', {
          style: {
            color: COLORS.marble,
            fontFamily: serif,
            fontSize: 18,
            fontStyle: 'italic',
            lineHeight: 1.45
          }
        }, '“' + quote + '”'),
        h('div', {
          style: {
            color: COLORS.marbleDim,
            fontSize: 10,
            marginTop: 8,
            letterSpacing: .8
          }
        }, '— IDEA DE EPICTETO')
      ),
      h('img', {
        src: 'epictetus.webp',
        alt: 'Epicteto',
        style: {
          position: 'absolute',
          right: -12,
          bottom: -16,
          width: 145,
          height: 145,
          borderRadius: '50%',
          objectFit: 'cover',
          objectPosition: '50% 18%',
          opacity: .65
        }
      })
    );
  }

  function SectionTitle({ num, title, subtitle }) {
    return h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        marginBottom: 13
      }
    },
      h('div', {
        style: {
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '1px solid ' + COLORS.bronze,
          color: COLORS.bronzeLight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 800,
          flexShrink: 0
        }
      }, num),
      h('div', null,
        h('div', {
          style: {
            color: COLORS.marble,
            fontFamily: serif,
            fontSize: 18,
            lineHeight: 1.15
          }
        }, title),
        subtitle && h('div', {
          style: {
            color: COLORS.marbleDim,
            fontSize: 11,
            marginTop: 3,
            lineHeight: 1.4
          }
        }, subtitle)
      )
    );
  }

  function AudioButton({ text, rate, status }) {
    return h('button', {
      onClick: () => c1Speak(text, rate, status),
      style: {
        ...ghost,
        padding: '7px 10px',
        minHeight: 36,
        color: COLORS.bronzeLight
      }
    }, '🔊');
  }

  function C1Home({ meta, onOpenDay, onCalendar }) {
    const total = w.C1_COURSE?.totalDays || 69;
    const lesson = w.C1_COURSE?.days?.[Math.max(0, Math.min(total - 1, meta.day - 1))];
    const done = meta.completedDays?.length || 0;
    const value = pct(done, total);
    return h('div', null,
      h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 13,
          marginBottom: 16
        }
      },
        h('img', {
          src: 'epictetus.webp',
          alt: 'Epicteto',
          style: {
            width: 54,
            height: 54,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '1px solid ' + COLORS.bronze
          }
        }),
        h('div', null,
          h('div', {
            style: {
              fontFamily: serif,
              color: COLORS.marble,
              fontSize: 25
            }
          }, 'My Way to C1'),
          h('div', {
            style: {
              color: COLORS.marbleDim,
              fontSize: 11,
              marginTop: 3
            }
          }, 'Día ' + meta.day + ' de ' + total + ' · ' + value + '% completado')
        )
      ),
      h(ProgressLine, { value }),
      h('div', { style: { height: 14 } }),
      h(C1Moment, { day: meta.day }),
      h('div', { style: card },
        h('div', {
          style: {
            color: COLORS.bronzeLight,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1.1,
            marginBottom: 7
          }
        }, 'LECCIÓN DE HOY'),
        h('div', {
          style: {
            color: COLORS.marble,
            fontFamily: serif,
            fontSize: 25,
            lineHeight: 1.15
          }
        }, lesson?.title || 'My Way to C1'),
        h('div', {
          style: {
            color: COLORS.marbleDim,
            fontSize: 12,
            lineHeight: 1.55,
            marginTop: 8
          }
        }, lesson?.focus || 'Inglés general avanzado')
      ),
      h('div', { style: { ...card, padding: '0 16px' } },
        ['Qué estamos trabajando', 'Estructuras modelo', 'Shadowing · 3 rondas', 'Lectura profunda', 'Reto oral', 'Audio / Velocidad'].map((x, i) =>
          h('div', {
            key: x,
            style: {
              padding: '13px 0',
              borderBottom: i < 5 ? '1px solid ' + COLORS.line : 'none',
              color: COLORS.marble,
              fontSize: 13
            }
          }, (i + 1) + '. ' + x)
        )
      ),
      h('button', { onClick: onOpenDay, style: primary(COLORS.bronze) }, meta.completedDays?.includes(meta.day) ? 'Repasar día ' + meta.day : 'Continuar'),
      h('button', {
        onClick: onCalendar,
        style: { ...ghost, width: '100%', marginTop: 10 }
      }, '▦ Ver calendario')
    );
  }

  function C1Calendar({ meta, onPick }) {
    const total = w.C1_COURSE?.totalDays || 69;
    const latest = meta.lastMarkedDay ?? meta.lastCompletedDay ?? 0;
    const weeks = [];
    for (let start = 1; start <= total; start += 7) {
      const end = Math.min(total, start + 6);
      weeks.push([start, end]);
    }
    return h('div', null,
      h('div', {
        style: {
          color: COLORS.marble,
          fontFamily: serif,
          fontSize: 25,
          marginBottom: 6
        }
      }, 'Calendario · My Way to C1'),
      h('div', {
        style: {
          color: COLORS.marbleDim,
          fontSize: 12,
          lineHeight: 1.5,
          marginBottom: 18
        }
      }, '✓ Verde: último día guardado · Bronce: día actual · Todos los días están disponibles para repaso.'),
      weeks.map((range, wi) => h('div', {
        key: wi,
        style: { marginBottom: 18 }
      },
        h('div', {
          style: {
            color: COLORS.bronzeLight,
            fontSize: 11,
            letterSpacing: .6,
            marginBottom: 7
          }
        }, 'BLOQUE ' + (wi + 1) + ' · DÍAS ' + range[0] + '–' + range[1]),
        h('div', {
          style: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: 7
          }
        },
          Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i).map(d => {
            const last = d === latest;
            const current = meta.day === d;
            return h('button', {
              key: d,
              onClick: () => onPick(d),
              'aria-label': last ? `Día ${d}, último guardado` : `Día ${d}`,
              style: {
                width: 38,
                height: 38,
                borderRadius: 7,
                border: '1px solid ' + (last ? COLORS.verdigris : current ? COLORS.bronzeLight : COLORS.line),
                background: last ? COLORS.verdigris : current ? COLORS.bronze : COLORS.bgSoft,
                color: last || current ? COLORS.marble : COLORS.marbleDim,
                fontSize: 12,
                cursor: 'pointer'
              }
            }, last ? `${d} ✓` : d);
          })
        )
      ))
    );
  }

  function WorkingCard({ lesson }) {
    const wkg = lesson.working || {};
    const block = (label, text) => h('div', {
      style: {
        padding: '10px 0',
        borderBottom: '1px solid ' + COLORS.line
      }
    },
      h('div', {
        style: {
          color: COLORS.bronzeLight,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: .5,
          marginBottom: 5
        }
      }, label),
      h('div', {
        style: {
          color: COLORS.marbleDim,
          fontSize: 12.5,
          lineHeight: 1.6
        }
      }, text)
    );
    return h('div', { style: card },
      h(SectionTitle, {
        num: '1',
        title: 'Qué estamos trabajando',
        subtitle: 'Objetivo · base · contraste · matiz · comprobación'
      }),
      block('QUÉ VAS A PRACTICAR', wkg.goal),
      block('LA BASE', wkg.base),
      block('CONTRASTE Y TIP', [wkg.contrast, wkg.tip].filter(Boolean).join(' ')),
      block('PARA PROFUNDIZAR', wkg.deepen),
      h('details', {
        style: {
          marginTop: 12,
          border: '1px solid ' + COLORS.line,
          borderRadius: 10,
          padding: '11px 12px'
        }
      },
        h('summary', {
          style: {
            color: COLORS.marble,
            cursor: 'pointer',
            fontSize: 12.5,
            fontWeight: 700
          }
        }, 'Comprobación breve'),
        h('div', {
          style: {
            color: COLORS.marbleDim,
            fontSize: 12,
            lineHeight: 1.55,
            marginTop: 10
          }
        }, wkg.checkPrompt),
        h('div', {
          style: {
            color: COLORS.bronzeLight,
            fontSize: 11.5,
            lineHeight: 1.55,
            marginTop: 9
          }
        }, 'Respuesta razonada: ' + wkg.checkAnswer)
      )
    );
  }

  function C1Lesson({ lesson, meta, progress, onSaveDraft, onComplete }) {
    const [rate, setLocalRate] = useState(currentRate());
    const [status, setStatus] = useState('');
    const done = meta.completedDays?.includes(lesson.day);
    const draft = progress?.[lesson.day]?.oralDraft || '';

    const changeRate = n => {
      const next = setRate(n);
      setLocalRate(next);
    };

    return h('div', null,
      h('div', {
        style: {
          color: COLORS.bronzeLight,
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: 1.1,
          marginBottom: 6
        }
      }, 'DÍA ' + lesson.day + ' · C1'),
      h('div', {
        style: {
          color: COLORS.marble,
          fontFamily: serif,
          fontSize: 29,
          lineHeight: 1.12,
          marginBottom: 6
        }
      }, lesson.title),
      h('div', {
        style: {
          color: COLORS.marbleDim,
          fontSize: 12,
          lineHeight: 1.55,
          marginBottom: 16
        }
      }, lesson.focus),
      h(C1Moment, { day: lesson.day }),
      h(WorkingCard, { lesson }),

      h('div', { style: card },
        h(SectionTitle, { num: '2', title: 'Estructuras modelo', subtitle: 'Forma, significado y matiz en contexto.' }),
        (lesson.models || []).map((text, i) => h('div', {
          key: i,
          style: {
            display: 'flex',
            gap: 9,
            alignItems: 'flex-start',
            padding: '10px 0',
            borderBottom: i < lesson.models.length - 1 ? '1px solid ' + COLORS.line : 'none'
          }
        },
          h('div', {
            style: {
              flex: 1,
              color: COLORS.marble,
              fontFamily: serif,
              fontSize: 14.5,
              lineHeight: 1.55
            }
          }, text),
          h(AudioButton, { text, rate, status: setStatus })
        )),
        (lesson.sourceExamples || []).length > 0 && h('details', {
          style: {
            marginTop: 12,
            borderTop: '1px solid ' + COLORS.line,
            paddingTop: 10
          }
        },
          h('summary', {
            style: {
              color: COLORS.bronzeLight,
              cursor: 'pointer',
              fontSize: 11.5
            }
          }, 'Más ejemplos del banco C1 del documento (' + lesson.sourceExamples.length + ')'),
          h('div', { style: { marginTop: 8 } },
            lesson.sourceExamples.map((x, i) => h('div', {
              key: i,
              style: {
                color: COLORS.marbleDim,
                fontSize: 11.5,
                lineHeight: 1.55,
                padding: '7px 0',
                borderBottom: i < lesson.sourceExamples.length - 1 ? '1px solid ' + COLORS.line : 'none'
              }
            }, x))
          )
        )
      ),

      h('div', { style: card },
        h(SectionTitle, { num: '3', title: 'Shadowing', subtitle: 'Tres rondas · sentido, fragmentos y ritmo natural.' }),
        [
          ['Ronda 1 · Escucha', 'Escucha sin repetir. Identifica intención, palabras tónicas y reducciones.'],
          ['Ronda 2 · Fragmentos', 'Repite por grupos de sentido. Mantén la entonación y las conexiones.'],
          ['Ronda 3 · Ritmo natural', 'Di la frase completa junto al audio sin sacrificar claridad por velocidad.']
        ].map((r, idx) => h('div', {
          key: idx,
          style: {
            padding: '11px 0',
            borderBottom: idx < 2 ? '1px solid ' + COLORS.line : 'none'
          }
        },
          h('div', {
            style: {
              color: COLORS.marble,
              fontSize: 12.5,
              fontWeight: 700,
              marginBottom: 4
            }
          }, r[0]),
          h('div', {
            style: {
              color: COLORS.marbleDim,
              fontSize: 11.5,
              lineHeight: 1.5,
              marginBottom: 8
            }
          }, r[1]),
          idx < (lesson.shadowing || []).length && h('div', {
            style: {
              display: 'flex',
              gap: 8,
              alignItems: 'center'
            }
          },
            h('div', {
              style: {
                flex: 1,
                color: COLORS.marble,
                fontFamily: serif,
                fontSize: 13.5,
                lineHeight: 1.5
              }
            }, lesson.shadowing[idx]),
            h(AudioButton, { text: lesson.shadowing[idx], rate, status: setStatus })
          )
        ))
      ),

      h('div', { style: card },
        h(SectionTitle, { num: '4', title: 'Lectura profunda', subtitle: 'Comprensión, evidencia e inferencia.' }),
        h('div', {
          style: {
            color: COLORS.marble,
            fontFamily: serif,
            fontSize: 14,
            lineHeight: 1.7,
            marginBottom: 12
          }
        }, lesson.reading),
        h('button', {
          onClick: () => c1Speak(lesson.reading, rate, setStatus),
          style: { ...ghost, color: COLORS.bronzeLight, marginBottom: 12 }
        }, '🔊 Escuchar lectura'),
        h('div', {
          style: {
            color: COLORS.bronzeLight,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: .7,
            marginBottom: 7
          }
        }, 'PREGUNTAS'),
        (lesson.questions || []).map((q, i) => h('div', {
          key: i,
          style: {
            color: COLORS.marbleDim,
            fontSize: 12,
            lineHeight: 1.55,
            padding: '6px 0'
          }
        },
          h('div', null, (i + 1) + '. ' + q),
          lesson.readingAnswers?.[i] && h('details', { style: { marginTop: 7 } },
            h('summary', { style: { cursor: 'pointer', color: COLORS.bronzeLight } }, 'Ver ejemplo de respuesta'),
            h('p', { lang: 'en', style: { color: COLORS.marble, margin: '8px 0 4px' } }, lesson.readingAnswers[i].answer),
            h('p', { style: { margin: '0 0 6px' } }, 'Pista del texto: ' + lesson.readingAnswers[i].evidence)
          )
        ))
      ),

      h('div', { style: card },
        h(SectionTitle, { num: '5', title: 'Reto oral', subtitle: 'Responde, matiza y reformula en inglés.' }),
        h('div', {
          style: {
            color: COLORS.marble,
            fontSize: 12.5,
            lineHeight: 1.6,
            marginBottom: 10
          }
        }, lesson.oralChallenge),
        h('textarea', {
          value: draft,
          onChange: e => onSaveDraft(e.target.value),
          placeholder: 'Opcional: prepara aquí una idea breve antes de decirla en voz alta…',
          style: {
            width: '100%',
            minHeight: 92,
            resize: 'vertical',
            background: COLORS.bg,
            color: COLORS.marble,
            border: '1px solid ' + COLORS.line,
            borderRadius: 10,
            padding: 11,
            fontSize: 12.5,
            lineHeight: 1.5,
            outline: 'none'
          }
        })
      ),

      h('div', { style: card },
        h(SectionTitle, { num: '6', title: 'Audio / Velocidad', subtitle: 'Baja el ritmo para practicar y vuelve a velocidad natural.' }),
        h('div', {
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
            gap: 7,
            marginBottom: 11
          }
        },
          [0.75, 0.9, 1, 1.15].map(n => h('button', {
            key: n,
            onClick: () => changeRate(n),
            style: {
              ...ghost,
              minWidth: 0,
              padding: '8px 4px',
              color: Math.abs(rate - n) < .001 ? COLORS.marble : COLORS.marbleDim,
              background: Math.abs(rate - n) < .001 ? COLORS.bronze : 'transparent',
              borderColor: Math.abs(rate - n) < .001 ? COLORS.bronzeLight : COLORS.line
            }
          }, n + '×'))
        ),
        h('button', {
          onClick: () => c1Speak((lesson.shadowing || []).join(' '), rate, setStatus),
          style: primary(COLORS.bronze)
        }, '🔊 Reproducir práctica completa'),
        status && h('div', {
          style: {
            color: COLORS.marbleDim,
            fontSize: 10.5,
            lineHeight: 1.4,
            marginTop: 8
          }
        }, status)
      ),

      h('button', {
        onClick: onComplete,
        disabled: done,
        style: {
          ...primary(done ? COLORS.verdigris : COLORS.bronze),
          opacity: done ? .8 : 1,
          cursor: done ? 'default' : 'pointer',
          marginBottom: 30
        }
      }, done ? '✓ Día completado' : '✓ Guardar día ' + lesson.day + ' como hecho')
    );
  }

  function C1App() {
    const course = w.C1_COURSE;
    const [meta, setMeta] = useState(() => readJSON(C1_META_KEY, defaultC1Meta()));
    const [progress, setProgress] = useState(() => readJSON(C1_PROGRESS_KEY, {}));
    const [view, setView] = useState('home');
    const [activeDay, setActiveDay] = useState(meta.day || 1);

    useEffect(() => { try { w.StoicAudio?.stop?.(); } catch {} }, [view, activeDay]);

    if (!course?.days?.length) {
      return h('div', {
        style: {
          minHeight: '100vh',
          background: COLORS.bg,
          color: COLORS.marble,
          padding: 24,
          fontFamily: sans
        }
      }, 'No se pudo cargar el contenido C1.');
    }

    const total = course.totalDays;
    const lesson = course.days[Math.max(0, Math.min(total - 1, activeDay - 1))];

    const saveMeta = next => {
      setMeta(next);
      writeJSON(C1_META_KEY, next);
    };
    const saveProgress = next => {
      setProgress(next);
      writeJSON(C1_PROGRESS_KEY, next);
    };
    const openDay = d => {
      setActiveDay(Math.max(1, Math.min(total, d)));
      setView('day');
    };
    const saveDraft = value => {
      saveProgress({
        ...progress,
        [activeDay]: {
          ...(progress[activeDay] || {}),
          oralDraft: value
        }
      });
    };
    const complete = () => {
      const already = meta.completedDays?.includes(activeDay);
      if (already) return;
      const completedDays = [...(meta.completedDays || []), activeDay].sort((a,b)=>a-b);
      const isSequential = activeDay === meta.day;
      const nextDay = isSequential ? Math.min(total, activeDay + 1) : meta.day;
      const streak = isSequential
        ? (meta.lastCompletedDay === activeDay - 1 || activeDay === 1 ? (meta.streak || 0) + 1 : 1)
        : meta.streak || 0;
      saveMeta({
        ...meta,
        day: nextDay,
        lastMarkedDay: activeDay,
        lastCompletedDay: Math.max(meta.lastCompletedDay || 0, activeDay),
        streak,
        completedDays
      });
      setView('home');
    };

    return h('div', {
      style: {
        minHeight: '100vh',
        background: COLORS.bg,
        color: COLORS.marble,
        fontFamily: sans
      }
    },
      h('div', {
        style: {
          maxWidth: 520,
          margin: '0 auto',
          padding: '22px 18px 42px'
        }
      },
        view === 'home' && h(C1Home, {
          meta,
          onOpenDay: () => openDay(meta.day),
          onCalendar: () => setView('calendar')
        }),
        view === 'calendar' && h(React.Fragment, null,
          h('button', {
            onClick: () => setView('home'),
            style: { ...ghost, marginBottom: 16 }
          }, '‹ Volver'),
          h(C1Calendar, { meta, onPick: openDay })
        ),
        view === 'day' && h(React.Fragment, null,
          h('button', {
            onClick: () => setView('home'),
            style: { ...ghost, marginBottom: 16 }
          }, '‹ Inicio C1'),
          h(C1Lesson, {
            lesson,
            meta,
            progress,
            onSaveDraft: saveDraft,
            onComplete: complete
          })
        )
      )
    );
  }

  function StayStoicShell() {
    const [moduleId, setModuleId] = useState(null);

    if (!moduleId) {
      return h(ModuleHub, { onSelect: setModuleId });
    }

    const title = moduleId === 'english' ? 'English My Way' : moduleId === 'c1' ? 'My Way to C1' : 'My Way Up at Amazon';

    return h('div', {
      style: {
        minHeight: '100vh',
        background: COLORS.bg
      }
    },
      h(ModuleTopBar, {
        title,
        onModules: () => {
          try { w.StoicAudio?.stop?.(); } catch {}
          setModuleId(null);
        }
      }),
      moduleId === 'english'
        ? (w.StayStoicApp ? h(w.StayStoicApp) : h('div', { style: { color: COLORS.marble, padding: 20 } }, 'Cargando English My Way…'))
        : moduleId === 'c1'
          ? h(C1App)
          : h('div', {
              style: {
                color: COLORS.marble,
                padding: 24,
                fontFamily: sans
              }
            }, 'En preparación')
    );
  }

  w.StayStoicModuleKeys = {
    english: { meta: LEGACY_META_KEY, progress: 'staystoic_progress_v4' },
    c1: { meta: C1_META_KEY, progress: C1_PROGRESS_KEY },
    amazon: { meta: AMAZON_META_KEY, progress: AMAZON_PROGRESS_KEY }
  };
  w.StayStoicShell = StayStoicShell;
})(window);
